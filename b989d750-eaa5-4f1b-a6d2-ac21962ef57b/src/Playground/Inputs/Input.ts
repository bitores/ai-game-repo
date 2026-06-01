import { Nullable, KeyboardInfo, Observer, Scene, KeyboardEventTypes, VirtualJoystick, Tools } from "@babylonjs/core";
import { Agent } from "../Agent";
import { State } from "../States/State";
import { States } from "../States/States";
import { Parameters } from '../Parameters';
import { GamepadInput } from './GamepadInput';
import { Settings } from "../../Settings";
import { useNative } from "../../playgroundRunner";

declare var document : any;

export enum WeaponType {
    STARDUST_BEAM = 0,
    GRAVITY_GRENADE = 1,
    CORE_MISSILE = 2,
}

export class Input
{
    dx: number = 0;
    dy: number = 0;
    // Horizontal movement
    moveLeft: boolean = false;
    moveRight: boolean = false;
    moveForward: boolean = false;
    moveBackward: boolean = false;
    // Vertical movement (QE)
    moveUp: boolean = false;
    moveDown: boolean = false;
    // Boost (Shift)
    boost: boolean = false;
    // Old fields kept for compatibility
    shooting: boolean = false;
    launchMissile: boolean = false;
    burst: boolean = false;
    breaking: boolean = false;
    immelmann: boolean = false;

    // New weapon inputs
    fireBeam: boolean = false;      // Left mouse - stardust beam
    fireGrenade: boolean = false;   // Right mouse - gravity grenade
    fireMissile: boolean = false;   // R key - core missile
    activeWeapon: WeaponType = WeaponType.STARDUST_BEAM;
    switchWeapon1: boolean = false;
    switchWeapon2: boolean = false;
    switchWeapon3: boolean = false;

    // Shield
    shieldActive: boolean = false;  // Space

    public constrainInput() {
        this.dx = Math.max(Math.min(Parameters.playerTurnRate, this.dx), -Parameters.playerTurnRate);
        this.dy = Math.max(Math.min(Parameters.playerTurnRate, this.dy), -Parameters.playerTurnRate);
    }
}

// credit: https://stackoverflow.com/questions/4817029/whats-the-best-way-to-detect-a-touch-screen-device-using-javascript
function isTouchDevice() {
    return (('ontouchstart' in window) ||
       (navigator.maxTouchPoints > 0) ||
       ((navigator as any).msMaxTouchPoints > 0));
}

export class InputManager {
    private static _scene: Scene;
    private static _keyboardObserver: Nullable<Observer<KeyboardInfo>> = null;
    public static input: Input = new Input;
    private static _canvas: HTMLCanvasElement;
    public static deltaTime: number = 0;
    public static isTouch = false;

    constructor(scene: Scene, canvas: HTMLCanvasElement)
    {
        InputManager._scene = scene;
        InputManager._canvas = canvas;

        InputManager.isTouch = isTouchDevice();

        InputManager.setupPointerLock();

        scene.onKeyboardObservable.add((kbInfo) => {
            switch (kbInfo.type) {
                case KeyboardEventTypes.KEYDOWN:
                    // WASD horizontal movement
                    if (kbInfo.event.keyCode == 87) { // W - forward
                        InputManager.input.moveForward = true;
                    } else if (kbInfo.event.keyCode == 83) { // S - backward
                        InputManager.input.moveBackward = true;
                    } else if (kbInfo.event.keyCode == 65) { // A - left
                        InputManager.input.moveLeft = true;
                    } else if (kbInfo.event.keyCode == 68) { // D - right
                        InputManager.input.moveRight = true;
                    }
                    // QE vertical movement
                    else if (kbInfo.event.keyCode == 81) { // Q - move up
                        InputManager.input.moveUp = true;
                    } else if (kbInfo.event.keyCode == 69) { // E - move down
                        InputManager.input.moveDown = true;
                    }
                    // Shift boost (key 16)
                    else if (kbInfo.event.keyCode == 16) { // Shift - boost
                        InputManager.input.boost = true;
                    }
                    // Space shield
                    else if (kbInfo.event.keyCode == 32) { // Space - shield
                        InputManager.input.shieldActive = true;
                    }
                    // R - core missile
                    else if (kbInfo.event.keyCode == 82) { // R - fire missile
                        InputManager.input.fireMissile = true;
                    }
                    // 1-3 weapon switch
                    else if (kbInfo.event.keyCode == 49) { // 1
                        InputManager.input.switchWeapon1 = true;
                        InputManager.input.activeWeapon = WeaponType.STARDUST_BEAM;
                    } else if (kbInfo.event.keyCode == 50) { // 2
                        InputManager.input.switchWeapon2 = true;
                        InputManager.input.activeWeapon = WeaponType.GRAVITY_GRENADE;
                    } else if (kbInfo.event.keyCode == 51) { // 3
                        InputManager.input.switchWeapon3 = true;
                        InputManager.input.activeWeapon = WeaponType.CORE_MISSILE;
                    }

                    // Keep old keys for backward compatibility
                    if (kbInfo.event.keyCode == 87) {
                        InputManager.input.burst = true;
                    } else if (kbInfo.event.keyCode == 83){
                        InputManager.input.breaking  = true;
                    } else if (kbInfo.event.keyCode == 81) {
                        InputManager.input.immelmann = true;
                    }
                    break;
                case KeyboardEventTypes.KEYUP:
                    // WASD horizontal movement
                    if (kbInfo.event.keyCode == 87) { // W
                        InputManager.input.moveForward = false;
                    } else if (kbInfo.event.keyCode == 83) { // S
                        InputManager.input.moveBackward = false;
                    } else if (kbInfo.event.keyCode == 65) { // A
                        InputManager.input.moveLeft = false;
                    } else if (kbInfo.event.keyCode == 68) { // D
                        InputManager.input.moveRight = false;
                    }
                    // QE vertical movement
                    else if (kbInfo.event.keyCode == 81) { // Q
                        InputManager.input.moveUp = false;
                    } else if (kbInfo.event.keyCode == 69) { // E
                        InputManager.input.moveDown = false;
                    }
                    // Shift boost
                    else if (kbInfo.event.keyCode == 16) { // Shift
                        InputManager.input.boost = false;
                    }
                    // Space shield
                    else if (kbInfo.event.keyCode == 32) { // Space
                        InputManager.input.shieldActive = false;
                    }
                    // R fire missile
                    else if (kbInfo.event.keyCode == 82) { // R
                        InputManager.input.fireMissile = false;
                    }

                    // Keep old keys for backward compatibility
                    if (kbInfo.event.keyCode == 87) {
                        InputManager.input.burst = false;
                    } else if (kbInfo.event.keyCode == 83){
                        InputManager.input.breaking  = false;
                    } else if (kbInfo.event.keyCode == 81) {
                        InputManager.input.immelmann = false;
                    }
                    break;
            }
        });

        GamepadInput.initialize();
    }

    static mouseMove(e: any)
    {
        if (InputManager.isTouch) {
            return;
        }
        if (GamepadInput.gamepads.length != 0) {
            return;
        }
        const deltaTime = InputManager.deltaTime;

        var movementX = e.movementX ||
                e.mozMovementX ||
                e.webkitMovementX ||
                0;

        var movementY = e.movementY ||
                e.mozMovementY ||
                e.webkitMovementY ||
                0;

        const input = InputManager.input;
        input.dx = movementX * Parameters.mouseSensitivty * deltaTime;
        input.dy = movementY * Parameters.mouseSensitivty * deltaTime;
        if (Settings.invertY) {
            input.dy *= -1;
        }
        input.constrainInput();

        // Left mouse = stardust beam, Right mouse = gravity grenade
        input.fireBeam = e.buttons == 1;
        input.fireGrenade = e.buttons == 2;

        // Keep old fields for backward compatibility
        input.shooting = e.buttons == 1;
        input.launchMissile = e.buttons == 2;
    }

    static changeCallback(e: any)
    {
        const pointerEventType = Tools.IsSafari() ? "mouse" : "pointer";
        if (document.pointerLockElement === InputManager._canvas ||
            document.mozPointerLockElement === InputManager._canvas ||
            document.webkitPointerLockElement === InputManager._canvas
        ){
            // we've got a pointerlock for our element, add a mouselistener
            document.addEventListener(`${pointerEventType}move`, InputManager.mouseMove, false);
            document.addEventListener(`${pointerEventType}down`, InputManager.mouseMove, false);
            document.addEventListener(`${pointerEventType}up`, InputManager.mouseMove, false);
        } else {
            // pointer lock is no longer active, remove the callback
            document.removeEventListener(`${pointerEventType}move`, InputManager.mouseMove, false);
            document.removeEventListener(`${pointerEventType}down`, InputManager.mouseMove, false);
            document.removeEventListener(`${pointerEventType}up`, InputManager.mouseMove, false);

            State.setCurrent(States.inGameMenu);
        }
    };

    public static disablePointerLock() {
        if (!useNative && !InputManager.isTouch) {
            if (document.exitPointerLock) {
                document.exitPointerLock();
            }
            var canvas = InputManager._canvas;
            if (canvas) {
                canvas.onclick = function(){};
            }
        }
    }

    public static setupPointerLock() {

        if (!useNative && !InputManager.isTouch) {
            // register the callback when a pointerlock event occurs
            document.addEventListener('pointerlockchange', InputManager.changeCallback, false);
            document.addEventListener('mozpointerlockchange', InputManager.changeCallback, false);
            document.addEventListener('webkitpointerlockchange', InputManager.changeCallback, false);

            // when element is clicked, we're going to request a
            // pointerlock
            var canvas = InputManager._canvas;
            canvas.onclick = function(){
                canvas.requestPointerLock =
                canvas.requestPointerLock ||
                canvas.mozRequestPointerLock ||
                canvas.webkitRequestPointerLock
                ;

                // Ask the browser to lock the pointer)
                canvas.requestPointerLock();
            };
        }
    }

    dispose() {
        InputManager.disablePointerLock();
        InputManager._scene.onKeyboardObservable.remove(InputManager._keyboardObserver);
    }
}
