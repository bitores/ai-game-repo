import { Nullable } from "@babylonjs/core";
import { Control, Grid, StackPanel, TextBlock } from "@babylonjs/gui";
import { GameDefinition } from "../Game";
import { GameState } from "./GameState";
import { State } from "./State";
import { States } from "./States";
import { Assets } from "../Assets";
import { GuiFramework } from "../GuiFramework";
import { InputManager } from "../Inputs/Input";

export class BattleSelect extends State {

    public static gameDefinition: Nullable<GameDefinition> = null;
    private static missions: any = null;

    public exit() {
        super.exit();
    }

    public enter() {
        super.enter();
        if (!this._adt) {
            return;
        }

        if (GuiFramework.isLandscape) {
            GuiFramework.createBottomBar(this._adt);
            let instructions = GuiFramework.createRecapGrid();
            var panel = new StackPanel();
            panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
            let grid = new Grid();
            grid.paddingBottom = "100px";
            grid.paddingLeft = "100px";
            GuiFramework.formatButtonGrid(grid);
            grid.addControl(panel, 0, 0);
            const panelGrid: Grid = GuiFramework.createTextPanel(grid);
            GuiFramework.createPageTitle("Starchaser Ops", panelGrid);
            grid.addControl(instructions, 0, 1);

            const splashText = GuiFramework.createSplashText("Collect Stardust. Dominate.");
            instructions.addControl(splashText, 0, 0);

            const inputControls = GuiFramework.createStatsGrid();
            instructions.addControl(inputControls, 1, 0);

            if (InputManager.isTouch) {
                GuiFramework.createParameter(inputControls, "Steer", GuiFramework.createStatText("Virtual Thumbstick"));
                GuiFramework.createParameter(inputControls, "Stardust Beam", GuiFramework.createStatText("Fire Button"));
                GuiFramework.createParameter(inputControls, "Gravity Grenade", GuiFramework.createStatText("Alt Fire"));
                GuiFramework.createParameter(inputControls, "Boost", GuiFramework.createStatText("Boost Button"));
                GuiFramework.createParameter(inputControls, "Vertical Move", GuiFramework.createStatText("Up/Down Buttons"));
            } else {
                GuiFramework.createParameter(inputControls, "Steer", GuiFramework.createStatText("Mouse"));
                GuiFramework.createParameter(inputControls, "Stardust Beam [Wpn 1]", GuiFramework.createStatText("Left Mouse Button"));
                GuiFramework.createParameter(inputControls, "Gravity Grenade [Wpn 2]", GuiFramework.createStatText("Right Mouse Button"));
                GuiFramework.createParameter(inputControls, "Core Missile [Wpn 3]", GuiFramework.createStatText("R Key (Lock On)"));
                GuiFramework.createParameter(inputControls, "Move Fwd/Back/Strafe", GuiFramework.createStatText("WASD"));
                GuiFramework.createParameter(inputControls, "Vertical Lift", GuiFramework.createStatText("Q (Up) / E (Down)"));
                GuiFramework.createParameter(inputControls, "Boost", GuiFramework.createStatText("Shift"));
                GuiFramework.createParameter(inputControls, "Switch Weapons", GuiFramework.createStatText("1 / 2 / 3"));
                GuiFramework.createParameter(inputControls, "Energy Shield", GuiFramework.createStatText("Space (costs stardust)"));
            }

            Assets.missions.forEach((scenario: any) => {
                let button = GuiFramework.addButton(scenario.name, panel)
                button.onPointerMoveObservable.add(() => {
                    splashText.text = scenario.description;
                });
                button.onPointerDownObservable.add(() => {
                    GameState.gameDefinition = scenario.gameDefinition;
                    State.setCurrent(States.gameState);
                })
            });

            let button = GuiFramework.addButton("Back", panel);
            button.onPointerMoveObservable.add(function(info) {
                splashText.text = "";
            });
            button.onPointerDownObservable.add(function(info) {
                State.setCurrent(States.main);
            });

            this._adt.addControl(grid);

        } else {
            let grid = new Grid();
            grid.addRowDefinition(0.2, false);
            grid.addRowDefinition(0.8, false);
            grid.addColumnDefinition(1.0, false);
            let textBlock = new TextBlock("", "STARCHASER OPS");
            GuiFramework.setFont(textBlock, true, true);
            textBlock.fontSize = 35;
            textBlock.color = "#a6fffa";
            textBlock.horizontalAlignment =  Control.HORIZONTAL_ALIGNMENT_CENTER;
            textBlock.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
            textBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
            textBlock.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
            grid.addControl(textBlock, 0, 0);

            const splashText = GuiFramework.createSplashText("");
            splashText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
            grid.addControl(splashText, 1, 0);

            var panel = new StackPanel();
            panel.paddingBottom = "100px";
            Assets.missions.forEach((scenario: any) => {
                let button = GuiFramework.addButton(scenario.name, panel)
                button.onPointerMoveObservable.add(() => {
                    splashText.text = scenario.description;
                });
                button.onPointerDownObservable.add(() => {
                    GameState.gameDefinition = scenario.gameDefinition;
                    State.setCurrent(States.gameState);
                })
            });

            panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
            let button = GuiFramework.addButton("Back", panel);
            button.onPointerMoveObservable.add(function(info) {
                splashText.text = "";
            });
            button.onPointerDownObservable.add(function(info) {
                State.setCurrent(States.main);
            });
            grid.addControl(panel, 2, 0);

            this._adt.addControl(grid);

        }
    }
}
