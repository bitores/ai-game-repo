import { Texture, HemisphericLight, Vector3,  Mesh, Scene, Nullable, Color3, Observer, AbstractMesh, Light, LensFlareSystem, LensFlare,  TransformNode, VolumetricLightScatteringPostProcess, Camera, GlowLayer, StandardMaterial, Color4, MeshBuilder } from "@babylonjs/core";
import { Ship } from "./Ship";
import { Assets} from "./Assets"
import { GameDefinition } from "./Game";
import { PlanetBaker } from "./FX/PlanetBaker";
import { Parameters } from "./Parameters";

var seed = 1;
function random() {
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

// Babylon.js 5.x doesn't have Color3.FromHSV — added in v7.
function hsvToColor3(hueDeg: number, sat: number, val: number): Color3 {
    const h = hueDeg / 60;
    const i = Math.floor(h);
    const f = h - i;
    const p = val * (1 - sat);
    const q = val * (1 - sat * f);
    const t = val * (1 - sat * (1 - f));
    switch (i % 6) {
        case 0: return new Color3(val, t, p);
        case 1: return new Color3(q, val, p);
        case 2: return new Color3(p, val, t);
        case 3: return new Color3(p, q, val);
        case 4: return new Color3(t, p, val);
        default: return new Color3(val, p, q);
    }
}

class Asteroid {
    asteroidRootTransform: TransformNode;
    radius: number = 0;
    position: Vector3 = new Vector3();
    subRadius: Array<number> = new Array<number>()
    subPosition: Array<Vector3> = new Array<Vector3>()
    private _debugSphere: Nullable<AbstractMesh> = null;
    private _isCrystal: boolean = false;
    public crystalGlow: Nullable<Mesh> = null;

    constructor(assets: Assets, scene: Scene, asteroidRadius: number) {
        this.asteroidRootTransform = new TransformNode("AsteroidRoot", scene);
        const asteroidLocationContainer = assets.asteroidLocation;
        if (!asteroidLocationContainer) {
            return;
        }
        const asteroidMeshContainer = assets.asteroidMeshes;
        if (!asteroidMeshContainer) {
            return;
        }

        // Crystal appearance chance
        this._isCrystal = Math.random() < 0.3;
        const scale = 100.0;
        this.asteroidRootTransform.position.x = random() * asteroidRadius - asteroidRadius * 0.5;
        this.asteroidRootTransform.position.y = random() * asteroidRadius - asteroidRadius * 0.5;
        this.asteroidRootTransform.position.z = random() * asteroidRadius - asteroidRadius * 0.5;

        this.asteroidRootTransform.rotation.x = random() * Math.PI * 2;
        this.asteroidRootTransform.rotation.y = random() * Math.PI * 2;
        this.asteroidRootTransform.rotation.z = random() * Math.PI * 2;

        let asteroidPoints: Vector3[] = [];
        this.asteroidRootTransform.scaling = new Vector3(scale, scale, scale);
        asteroidLocationContainer.transformNodes.forEach((loc) => {
            const locName = loc.name.substring(0,15);
            asteroidMeshContainer.meshes.forEach((msh) => {
                if (msh.name.substring(0, 15) === locName) {
                    const transform = (loc as TransformNode).clone("AsteroidLocation", this.asteroidRootTransform);
                    const subMesh = msh.clone(locName, transform);
                    subMesh?.computeWorldMatrix(true);
                    subMesh?.freezeWorldMatrix();
                    if (subMesh?.material) {
                        subMesh.material.freeze();
                        // Crystal effect: make semi-transparent with fluorescent glow
                        if (this._isCrystal) {
                            const crystalMat = subMesh.material.clone("crystal_" + locName) as StandardMaterial;
                            if (crystalMat) {
                                crystalMat.alpha = 0.3 + Math.random() * 0.2;
                                crystalMat.alphaMode = 1; // ALPHA_ADD
                                // Fluorescent inner glow
                                const hue = Math.random() * 0.15 + 0.05; // green-cyan range
                                const glowColor = hsvToColor3(hue * 360, 0.8, 1.0);
                                crystalMat.emissiveColor = glowColor;
                                crystalMat.emissiveIntensity = Parameters.fluorescentGlowIntensity;
                                subMesh.material = crystalMat;
                            }
                        }
                    }

                    const subRadius = subMesh?.getBoundingInfo().boundingSphere.radiusWorld;
                    const subPosition = subMesh?.getBoundingInfo().boundingSphere.centerWorld;
                    if (subRadius && subPosition) {
                        this.subRadius.push(subRadius);
                        this.subPosition.push(subPosition);
                        asteroidPoints.push(subPosition);
                    }
                }
            });
        });

        // Add crystal glow sphere for crystal asteroids
        if (this._isCrystal) {
            const glowSphere = MeshBuilder.CreateSphere("crystalGlow", { diameter: 30 }, scene);
            glowSphere.position.copyFrom(this.asteroidRootTransform.position);
            glowSphere.parent = this.asteroidRootTransform;
            const glowMat = new StandardMaterial("crystalGlowMat", scene);
            const glowColor = hsvToColor3((Math.random() * 0.15 + 0.05) * 360, 0.8, 1.0);
            glowMat.emissiveColor = glowColor;
            glowMat.alpha = 0.2;
            glowSphere.material = glowMat;
            this.crystalGlow = glowSphere;
        }

        // compute rough estimation of enclosing sphere
        this.position.set(0, 0, 0);
        asteroidPoints.forEach((p) => {
            this.position.addInPlace(p);
        });
        this.position.divideInPlace(new Vector3().setAll(asteroidPoints.length));
        this.radius = 0;
        asteroidPoints.forEach((p) => {
            this.radius = Math.max(this.radius, Vector3.Distance(this.position, p));
        });

        this.radius *= 4;
    }

    public isCrystal(): boolean {
        return this._isCrystal;
    }

    public dispose(): void {
        if (this._debugSphere) {
            this._debugSphere.dispose();
        }
        if (this.crystalGlow) {
            this.crystalGlow.dispose();
        }
        this.asteroidRootTransform.dispose();
    }
}

export class World {
    private _starfield: Nullable<AbstractMesh>;
    private _asteroids: Array<Asteroid> = new Array<Asteroid>();
    private _renderObserver: Nullable<Observer<Scene>> = null;
    private _scene: Scene;
    private _planet: Mesh;
    private _atmosphere: Nullable<AbstractMesh> = null;
    private _tmpVec3: Vector3 = new Vector3();
    private _camera: Camera;
    public ship: Nullable<Ship> = null;
    public sun:VolumetricLightScatteringPostProcess;

    constructor(assets: Assets, scene: Scene, gameDefinition: GameDefinition, camera: Camera, glowLayer: GlowLayer) {
        seed = gameDefinition.seed;

        this._scene = scene;
        this._camera = camera;

        this._starfield = assets.starfield;
        if (this._starfield) {
            this._starfield.parent = null;
        }

        // planet
        this._planet = assets.planetBaker.createPlanet(scene, 1000, glowLayer);

        // sun
        this.sun = PlanetBaker.CreateSunPostProcess(camera, scene, assets);

        // asteroids
        for (let i = 0; i < gameDefinition.asteroidCount; i++)
        {
            this._asteroids.push(new Asteroid(assets, scene, gameDefinition.asteroidRadius));
        }

        this._renderObserver = scene.onBeforeRenderObservable.add( () => {
            const camera = (scene.activeCameras?.length && scene.activeCameras[0]) ? scene.activeCameras[0]: scene.activeCamera;
            if (camera) {
                const referencePosition = camera.position;
                if (referencePosition) {
                    if (this.ship && this._starfield) {
                        this._starfield.position.copyFrom(referencePosition);
                    }
                    if (this._planet && this.ship) {
                        this._planet.position.copyFrom(referencePosition);
                        this._planet.position.z += 2500;

                        World.updateSunPostProcess(referencePosition, this.sun.mesh);
                    }
                }
            }
        });
    }

    public static updateSunPostProcess(referencePosition: Vector3, sunMesh: Mesh) : void {
        sunMesh.position.copyFrom(referencePosition);
        sunMesh.position.x -= 0.47 * 1000;
        sunMesh.position.y -= -0.09 * 1000;
        sunMesh.position.z -= -0.86 * 1000;
    }

    public dispose(): void {
        this.sun.mesh.dispose();
        this.sun.dispose(this._camera);
        this._planet.dispose();
        this._asteroids.forEach((e) => { e.dispose();});
        this._scene.onBeforeRenderObservable.remove(this._renderObserver);
    }

    public collideWithAsteroids(position: Vector3, radius: number): boolean {
        for (let i = 0; i < this._asteroids.length; i++) {
            const asteroid = this._asteroids[i];
            if (!asteroid.asteroidRootTransform) {
                continue;
            }
            const distance = Vector3.Distance(position, asteroid.position);

            const delta = distance - radius - asteroid.radius * 0.5;
            if (delta < 0) {
                // finer approximation
                for (let sub = 0; sub < asteroid.subPosition.length; sub ++) {
                    const distanceSub = Vector3.Distance(position, asteroid.subPosition[sub]);

                    const deltaSub = distance - radius - asteroid.subRadius[sub] * 0.5;
                    if (deltaSub < 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    public shouldAvoid(position: Vector3, radius: number, avoidPos: Vector3): boolean {
        for (let i = 0; i < this._asteroids.length; i++) {
            const asteroid = this._asteroids[i];
            if (!asteroid.asteroidRootTransform) {
                continue;
            }
            const distance = Vector3.Distance(position, asteroid.position);

            const delta = distance - radius - asteroid.radius * 2;
            if (delta < 0) {
                position.subtractToRef(asteroid.position, this._tmpVec3);
                this._tmpVec3.normalize();
                this._tmpVec3.scaleInPlace(-delta);
                this._tmpVec3.addInPlace(position);
                avoidPos.copyFrom(this._tmpVec3);
                return true;
            }
        }
        return false;
    }

    public removeAsteroids(position: Vector3, radius: number): void {
        console.log("asteroid count before ", this._asteroids.length);
        for (let i = this._asteroids.length - 1; i >= 0; i--) {
            const asteroid = this._asteroids[i];
            const distance = Vector3.Distance(position, asteroid.position);

            const delta = distance - radius - asteroid.radius;
            if (delta < 0) {
                asteroid.dispose();
                this._asteroids.splice(i, 1);
            }
        }
        console.log("asteroid count after ", this._asteroids.length);
    }

    public destroyAsteroid(position: Vector3, radius: number): number {
        // Returns stardust amount from destroyed asteroids
        let stardustYield = 0;
        for (let i = this._asteroids.length - 1; i >= 0; i--) {
            const asteroid = this._asteroids[i];
            if (!asteroid.asteroidRootTransform) continue;

            const distance = Vector3.Distance(position, asteroid.position);
            const delta = distance - radius - asteroid.radius;
            if (delta < 10) {
                stardustYield += asteroid.isCrystal() ? Parameters.stardustPerAsteroid * 2 : Parameters.stardustPerAsteroid;
                asteroid.dispose();
                this._asteroids.splice(i, 1);
            }
        }
        return stardustYield;
    }

    public getAsteroids(): Array<{ position: Vector3, isCrystal: boolean }> {
        return this._asteroids.map(a => ({
            position: a.position,
            isCrystal: a.isCrystal(),
        }));
    }
}
