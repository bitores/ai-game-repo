import { Scene, Vector3, MeshBuilder, StandardMaterial, Color3, Color4, Mesh, ParticleSystem, AbstractMesh, Nullable, TransformNode, Quaternion, GlowLayer } from "@babylonjs/core";
import { Ship } from "../Ship";
import { Assets } from "../Assets";

export interface StardustPickup {
    mesh: Mesh;
    position: Vector3;
    amount: number;
    lifetime: number;
    maxLifetime: number;
    active: boolean;
}

export class StardustManager {
    private _scene: Scene;
    private _pickups: StardustPickup[] = [];
    private _glowLayer: GlowLayer;
    private _emitMaterial: StandardMaterial;

    constructor(scene: Scene, glowLayer: GlowLayer) {
        this._scene = scene;
        this._glowLayer = glowLayer;

        this._emitMaterial = new StandardMaterial("stardustMat", scene);
        this._emitMaterial.emissiveColor = new Color3(1, 0.8, 0.2);
        this._emitMaterial.alpha = 0.8;
    }

    public spawnStardust(position: Vector3, amount: number, count: number = 5): void {
        for (let i = 0; i < count; i++) {
            const mesh = MeshBuilder.CreateSphere("stardust_" + Date.now() + "_" + i, { diameter: 1 + Math.random() * 2 }, this._scene);
            mesh.position = position.clone();
            mesh.position.x += (Math.random() - 0.5) * 10;
            mesh.position.y += (Math.random() - 0.5) * 10;
            mesh.position.z += (Math.random() - 0.5) * 10;
            mesh.material = this._emitMaterial;

            this._pickups.push({
                mesh: mesh,
                position: mesh.position.clone(),
                amount: Math.max(1, Math.floor(amount / count)),
                lifetime: 15000, // 15 seconds
                maxLifetime: 15000,
                active: true,
            });
        }
    }

    public tick(deltaTime: number, ships: Ship[]): void {
        for (let i = this._pickups.length - 1; i >= 0; i--) {
            const pickup = this._pickups[i];
            if (!pickup.active) {
                continue;
            }

            pickup.lifetime -= deltaTime;
            if (pickup.lifetime <= 0) {
                pickup.mesh.dispose();
                this._pickups.splice(i, 1);
                continue;
            }

            // Pulse animation
            const pulse = 0.8 + Math.sin(Date.now() * 0.003 + i) * 0.2;
            pickup.mesh.scaling.setAll(pulse);

            // Check if any ship is near to collect
            for (const ship of ships) {
                if (!ship.isValid()) continue;
                const dist = Vector3.Distance(pickup.mesh.position, ship.root.position);
                if (dist < 8) {
                    // Collect!
                    ship.addStardust(pickup.amount);
                    pickup.mesh.dispose();
                    pickup.active = false;
                    this._pickups.splice(i, 1);
                    break;
                }
            }
        }
    }

    public dispose(): void {
        this._pickups.forEach((p) => {
            if (p.mesh) p.mesh.dispose();
        });
        this._pickups = [];
        this._emitMaterial.dispose();
    }
}
