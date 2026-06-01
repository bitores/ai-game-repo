import { Vector3, Scene, Nullable, AbstractMesh, Quaternion, Observer, NodeMaterial, KeyboardInfo, KeyboardEventTypes, Camera, FreeCamera, TargetCamera, GlowLayer, Color3 } from "@babylonjs/core";
import { ShipCamera } from "./ShipCamera";
import { InputManager } from "./Inputs/Input";
import { MissileManager, MAX_MISSILES } from "./Missile";
import { Ship, ShipManager } from "./Ship";
import { ShotManager } from "./Shot";
import { Assets } from "./Assets";
import { HUD } from './HUD';
import { States } from "./States/States";
import { State } from "./States/State";
import { Parameters, GameMode } from './Parameters';
import { Recorder } from "./Recorder/Recorder";
import { ExplosionManager } from "./FX/Explosion";
import { SparksEffects } from "./FX/SparksEffect";
import { GamepadInput } from "./Inputs/GamepadInput";
import { TrailManager } from "./FX/Trail";
import { World } from "./World";
import { StardustManager } from "./FX/StardustManager";

export class GameDefinition {
    public humanAllies: number = 0;
    public humanEnemies: number = 0;
    public aiAllies: number = 0;
    public aiEnemies: number = 0;
    public seed: number = 2022;
    public asteroidCount: number = 20;
    public asteroidRadius: number = 1000;
    public humanAlliesLife: number = 100;
    public humanEnemiesLife: number = 100;
    public aiAlliesLife: number = 50;
    public aiEnemiesLife: number = 10;
    public shotDamage: number = 1;
    public missileDamage: number = 20;
    public delayedEnd: number = 0;
    public enemyBoundaryRadius: number = 400;
    public humanBoundaryRadius: number = 800;
    // Starchaser fields
    public stardustToWin: number = 150;
    public matchTimeLimitMs: number = 480000;
    public resourceWellCount: number = 3;
    public aiShipsWithStardust: number = 5; // stardust each AI carries
}

export class Game
{
    private _shipManager: ShipManager;
    private _missileManager: MissileManager;
    private _shotManager: ShotManager;
    private _trailManager: TrailManager;
    private _scene: Scene;
    private _inputManager: InputManager;
    private _renderObserver: Nullable<Observer<Scene>> = null;
    private _HUD: Nullable<HUD>;
    private _speed: number = 1;
    private _targetSpeed: number = 1;
    private _recorder: Nullable<Recorder> = null;
    private _explosions: ExplosionManager;
    private _sparksEffects: SparksEffects;
    private _world: World;
    private _hotkeyObservable: Nullable<Observer<KeyboardInfo>> = null;
    private _cameraDummy: TargetCamera;
    public humanPlayerShips: Array<Ship> = new Array<Ship>();
    public activeCameras: Array<Camera> = new Array<Camera>();
    private _delayedEnd: number;
    // Starchaser tracking
    private _matchTimeMs: number = 0;
    private _matchTimeLimitMs: number = 480000;
    private _stardustToWin: number = 150;
    private _teamStardust: number[] = [0, 0]; // faction 0 and 1 stardust
    private _resourceWells: Array<{ position: Vector3, capturedBy: number, captureProgress: number, holdTime: number }> = [];
    private _isSpectatorMode: boolean = false;
    private _stardustManager: StardustManager;
    //private _glowLayer: GlowLayer;

    constructor(assets: Assets, scene: Scene, canvas: HTMLCanvasElement, gameDefinition: Nullable<GameDefinition>, glowLayer: GlowLayer)
    {
        this._scene = scene;

        var shootFrame = 0;

        if (!gameDefinition) {
            gameDefinition = new GameDefinition();
            gameDefinition.humanAllies = 1;
            gameDefinition.humanEnemies = 0;
            gameDefinition.aiEnemies = Parameters.enemyCount;
            gameDefinition.aiAllies = Parameters.allyCount;
            console.log("Using default game definition");
        }

        const MaxShips = gameDefinition.humanAllies + gameDefinition.humanEnemies + gameDefinition.aiEnemies + gameDefinition.aiAllies;
        this._shotManager = new ShotManager(assets, scene, glowLayer);
        this._trailManager = new TrailManager(scene, assets.trailMaterial ? assets.trailMaterial : new NodeMaterial("empty", scene), MaxShips + MAX_MISSILES);
        this._missileManager = new MissileManager(scene, this._trailManager);
        this._shipManager = new ShipManager(this._missileManager, this._shotManager, assets, this._trailManager, scene, MaxShips, gameDefinition, glowLayer);
        this._inputManager = new InputManager(scene, canvas);
        this._explosions = new ExplosionManager(scene, assets, glowLayer);
        this._sparksEffects = new SparksEffects(scene, assets);
        if (Parameters.recorderActive) {
            this._recorder = new Recorder(this._shipManager, this._explosions, this._sparksEffects, this._shotManager, this._missileManager, this._trailManager, Parameters.recordFrameCount);
            this._recorder.setRecordActive(true);
        }

        this._stardustManager = new StardustManager(scene, glowLayer);

        this.activeCameras = [];
        for (let i = 0; i < gameDefinition.humanAllies; i++)
        {
            const ship = this._shipManager.spawnShip(new Vector3(i * 50, 0, -500), Quaternion.Identity(), true, 0);
            if (ship) {
                const camera = new ShipCamera(ship, scene);
                ship.shipCamera = camera
                this.humanPlayerShips.push(ship);
                this.activeCameras.push(camera.getFreeCamera());
            }
        }

        this._world = new World(assets, scene, gameDefinition, this.activeCameras[0], glowLayer);

        for (let i = 0; i < gameDefinition.humanEnemies; i++)
        {
            const ship = this._shipManager.spawnShip(new Vector3(i * 50, 0, 500), Quaternion.FromEulerAngles(0, Math.PI, 0), true, 1);
            if (ship) {
                const camera = new ShipCamera(ship, scene);
                ship.shipCamera = camera;
                this.humanPlayerShips.push(ship);
                this.activeCameras.push(camera.getFreeCamera());
            }
        }

        this._cameraDummy = new FreeCamera("camera1", new Vector3(0, 0, 0), scene);
        this._cameraDummy.layerMask = 0x10000000;
        this.activeCameras.push(this._cameraDummy);
        
        // Cameras
        const divCamera = 1 / (this.activeCameras.length - 1);
        for(let i = 0; i < (this.activeCameras.length - 1); i ++) {
            const camera = this.activeCameras[i];
            camera.viewport.x = i * divCamera;
            camera.viewport.width = divCamera;
        }
        scene.activeCameras = this.activeCameras;
        if (this.humanPlayerShips.length) {
            this._world.ship = this.humanPlayerShips[0];
        }

        for (let i = 1; i <= gameDefinition.aiAllies; i++)
        {
            this._shipManager.spawnShip(
                new Vector3(Math.random() * 100 - 50, Math.random() * 100 - 50, Math.random() * 100 - 50 - 500), 
                Quaternion.FromEulerAngles(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2),
                false, 0);
        }

        for (let i = 1; i <= gameDefinition.aiEnemies; i++) {
            this._shipManager.spawnShip(
                new Vector3(Math.random() * 100 - 50, Math.random() * 100 - 50, Math.random() * 100 - 50 + 500), 
                Quaternion.FromEulerAngles(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2),
                false, 1);
        }

        // remove asteroids too close to ships
        this._world.removeAsteroids(new Vector3(0, 0, -500), 50);
        this._world.removeAsteroids(new Vector3(0, 0, 500), 50);

        this._HUD = new HUD(this._shipManager, assets, scene, this.humanPlayerShips);
        scene.customLODSelector = (mesh: AbstractMesh, camera: Camera) => { return mesh; };
        scene.freezeMaterials();
        //AbstractMesh.isInFrustum = function() { return true; };

        this._renderObserver = scene.onBeforeRenderObservable.add( () => {
            this._speed += (this._targetSpeed - this._speed) * 0.1;
            const deltaTime = scene.getEngine().getDeltaTime() * this._speed;
            InputManager.deltaTime = deltaTime;

            GamepadInput.gamepads.forEach(gp => gp.tick());

            shootFrame -= deltaTime;
            let canShoot = false;
            if (shootFrame <= 0) {
                canShoot = true;
                shootFrame = 130; // can shoot only every 130 ms
            }
            this._shipManager.tick(canShoot, InputManager.input, deltaTime, this._speed, this._sparksEffects, this._explosions, this._world, this._targetSpeed);
            
            this.humanPlayerShips.forEach((ship) => {
                if (ship && ship.shipCamera) {
                    var wmat = ship.root.getWorldMatrix();
                    ship.shipCamera.Tick(ship, wmat, ship.speedRatio, this._speed);
                }
            });

            this._shotManager.tick(deltaTime, this._world);
            this._missileManager.tick(deltaTime, this._explosions, this._world);

            // Stardust manager tick - handles pickup collection
            this._stardustManager.tick(deltaTime, this._shipManager.ships);

            // Stardust from asteroid destruction via beam
            this.humanPlayerShips.forEach((playerShip) => {
                if (playerShip && playerShip.isValid() && playerShip.activeWeapon === 0 && InputManager.input.fireBeam) {
                    const stardustFromAsteroid = this._world.destroyAsteroid(playerShip.root.position, 15);
                    if (stardustFromAsteroid > 0) {
                        playerShip.addStardust(stardustFromAsteroid);
                        this._stardustManager.spawnStardust(playerShip.root.position, stardustFromAsteroid, 3);
                    }
                }
            });

            if (this._HUD) {
                this._HUD.tick(scene.getEngine(), this._speed, this.humanPlayerShips, this._matchTimeMs, this._matchTimeLimitMs, this._teamStardust);
            }
            if (this._recorder) {
                this._recorder.tick();
            }
            this._sparksEffects.tick(deltaTime);
            this._explosions.tick(deltaTime);
            if (this._targetSpeed === 1) {
                this._trailManager.tick(deltaTime);
            }

            // victory check
            this._checkVictory(scene.getEngine().getDeltaTime() / 1000);
        });

        /* inspector
        this._hotkeyObservable = scene.onKeyboardObservable.add((kbInfo) => {
            switch (kbInfo.type) {
              case KeyboardEventTypes.KEYDOWN:
                if (kbInfo.event.key == 'i') {
                    if (this._scene.debugLayer.isVisible()) {
                        this._scene.debugLayer.hide();
                    } else {
                        this._scene.debugLayer.show();
                    }
                }
                break;
            }
        });
        */

        this._delayedEnd = gameDefinition.delayedEnd;
        this._matchTimeLimitMs = gameDefinition.matchTimeLimitMs;
        this._stardustToWin = gameDefinition.stardustToWin;

        // Initialize resource wells for resource control mode
        if (Parameters.gameMode === GameMode.RESOURCE_CONTROL) {
            const wellCount = gameDefinition.resourceWellCount;
            const angleStep = (Math.PI * 2) / wellCount;
            for (let i = 0; i < wellCount; i++) {
                const angle = angleStep * i + Math.random() * 0.5;
                const radius = 300 + Math.random() * 200;
                this._resourceWells.push({
                    position: new Vector3(Math.cos(angle) * radius, (Math.random() - 0.5) * 200, Math.sin(angle) * radius),
                    capturedBy: -1,
                    captureProgress: 0,
                    holdTime: 0,
                });
            }
        }
    }

    public getShipManager() : ShipManager {
        return this._shipManager;
    }

    public setTargetSpeed(speed: number): void {
        this._targetSpeed = speed;
    }
/*
    public getCamera(): Camera {
        return this._camera;
    }
*/
    public getRecorder(): Nullable<Recorder> {
        return this._recorder;
    }

    private _checkVictory(deltaTime: number): void {
        this._matchTimeMs += deltaTime * 1000;

        var enemyCount = 0;
        var allyCount = 0;
        var playerShip: Nullable<Ship> = null;
        var anyHumanAlive = false;

        this._shipManager.ships.forEach((ship, shipIndex) => {
            if (ship.isValid()) {
                if (ship.faction == 1) {
                    enemyCount++;
                } else {
                    allyCount++;
                }
                if (ship.isHuman) {
                    anyHumanAlive = true;
                    playerShip = ship;
                }
            }
        });

        // Update team stardust totals
        this._teamStardust[0] = 0;
        this._teamStardust[1] = 0;
        let maxPlayerStardust = 0;
        this._shipManager.ships.forEach((ship) => {
            if (ship.isValid()) {
                this._teamStardust[ship.faction] += ship.stardust;
                if (ship.isHuman && ship.stardust > maxPlayerStardust) {
                    maxPlayerStardust = ship.stardust;
                    playerShip = ship;
                }
            }
        });

        // Resource control mode - update wells
        if (Parameters.gameMode === GameMode.RESOURCE_CONTROL && anyHumanAlive && playerShip) {
            this._resourceWells.forEach((well) => {
                const dist = Vector3.Distance(playerShip!.root.position, well.position);
                if (dist < 50) {
                    well.captureProgress += deltaTime;
                    if (well.captureProgress >= Parameters.resourceWellCaptureTime / 1000) {
                        well.capturedBy = 0;
                        well.captureProgress = Parameters.resourceWellCaptureTime / 1000;
                        well.holdTime += deltaTime * 1000;
                    }
                } else {
                    // Slowly decay capture if no player nearby
                    well.captureProgress = Math.max(0, well.captureProgress - deltaTime * 0.5);
                }
            });

            // Check if all wells held for 60 seconds
            const allCaptured = this._resourceWells.every(w => w.capturedBy === 0);
            const minHoldTime = Math.min(...this._resourceWells.map(w => w.holdTime));
            if (allCaptured && minHoldTime >= Parameters.resourceWellHoldTime) {
                if (this._HUD) {
                    this._HUD.dispose();
                    this._HUD = null;
                }
                States.victory.ship = playerShip;
                State.setCurrent(States.victory);
                return;
            }
        }

        // Team deathmatch - check stardust victory
        if (Parameters.gameMode === GameMode.TEAM_DEATHMATCH) {
            if (this._teamStardust[0] >= this._stardustToWin && playerShip) {
                if (this._HUD) {
                    this._HUD.dispose();
                    this._HUD = null;
                }
                States.victory.ship = playerShip;
                State.setCurrent(States.victory);
                return;
            }
            if (this._teamStardust[1] >= this._stardustToWin && playerShip) {
                if (this._HUD) {
                    this._HUD.dispose();
                    this._HUD = null;
                }
                States.dead.ship = playerShip;
                State.setCurrent(States.dead);
                return;
            }
        }

        // Time limit
        if (this._matchTimeMs >= this._matchTimeLimitMs) {
            if (this._HUD) {
                this._HUD.dispose();
                this._HUD = null;
            }
            if (this._teamStardust[0] >= this._teamStardust[1] && playerShip) {
                States.victory.ship = playerShip;
                State.setCurrent(States.victory);
            } else {
                States.dead.ship = playerShip;
                State.setCurrent(States.dead);
            }
            return;
        }

        // Check if all human players are dead -> spectator mode
        if (!anyHumanAlive) {
            this._isSpectatorMode = true;
        }

        // Old-style check: player dead -> dead state (with revive option)
        if (!playerShip && !this._isSpectatorMode) {
            // Check if any teammate can revive
            let canRevive = false;
            this._shipManager.ships.forEach((ship) => {
                if (ship.isValid() && ship.faction === 0 && ship.stardust >= Parameters.stardustToRevive) {
                    canRevive = true;
                }
            });

            if (!canRevive) {
                if (this._delayedEnd <= 0) {
                    if (this._HUD) {
                        this._HUD.dispose();
                        this._HUD = null;
                    }
                    State.setCurrent(States.dead);
                }
                this._delayedEnd -= deltaTime;
            }
        }
    }

    public getMatchTime(): number {
        return this._matchTimeMs;
    }

    public getMatchTimeLimit(): number {
        return this._matchTimeLimitMs;
    }

    public getTeamStardust(faction: number): number {
        return this._teamStardust[faction] || 0;
    }

    public getResourceWells() {
        return this._resourceWells;
    }

    dispose()
    {
        this._shipManager.dispose();
        this._missileManager.dispose();
        this._shotManager.dispose();
        if (this._HUD) {
            this._HUD.dispose();
            this._HUD = null;
        }
        this._inputManager.dispose();
        if (this._recorder) {
            this._recorder.dispose();
        }
        this._explosions.dispose();
        this._sparksEffects.dispose();
        this._trailManager.dispose();
        this._world.dispose();
        this._stardustManager.dispose();
        this._scene.onBeforeRenderObservable.remove(this._renderObserver);
        this._cameraDummy.dispose();
        if (this._scene && this._hotkeyObservable) {
            this._scene.onKeyboardObservable.remove(this._hotkeyObservable);
        }
        //this._glowLayer.dispose();
    }
}