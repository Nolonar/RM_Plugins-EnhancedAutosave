/* 
 * MIT License
 * 
 * Copyright (c) 2020 Nolonar
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

//=============================================================================
// N_EnhancedAutosave
//=============================================================================
/*:
 * @target MZ
 * @plugindesc Adds some improvements to the existing autosave feature.
 * @author Nolonar
 * @url https://github.com/Nolonar/RM_Plugins-EnhancedAutosave
 * 
 * @param displayAutosaveWindow
 * @text Display Autosave Window
 * @desc Displays a window to inform the player that autosave is in progress, has succeeded, or failed.
 * @type boolean
 * @default true
 * 
 * @param preserveSaveCount
 * @text Preserve Save Count
 * @desc Prevents Autosave from increasing the "Save Count" variable.
 * @type boolean
 * @default true
 * 
 * @command autosave
 * @text Autosave
 * @desc Triggers an autosave.
 * 
 * 
 * @help Version 1.0.0
 * 
 * ============================================================================
 * Plugin Commands
 * ============================================================================
 * 
 * Autosave
 *      Triggers an autosave. Useful after a cutscene or completing a quest.
 *      Also works in the middle of an event, for instance right before an
 *      important decision.
 * 
 * ============================================================================
 * Notetags
 * ============================================================================
 * 
 * Map Notetag:
 *     <no autosave>
 *     Disables auto save for that map.
 */

(() => {
    //=========================================================================
    // To localize
    //=========================================================================
    const MESSAGE_SAVING = "Saving";
    const MESSAGE_SAVE_SUCCESS = "Saved";
    const MESSAGE_SAVE_FAILURE = "Saving failed";

    // Code
    const PLUGIN_NAME = "N_EnhancedAutosave";
    const COMMAND_AUTOSAVE = "autosave";
    const NOTETAG_NO_AUTOSAVE = "no autosave";

    let parameters = PluginManager.parameters(PLUGIN_NAME);
    parameters.preserveSaveCount = Boolean(parameters.preserveSaveCount) || true;
    parameters.displayAutosaveWindow = Boolean(parameters.displayAutosaveWindow) || true;

    PluginManager.registerCommand(PLUGIN_NAME, COMMAND_AUTOSAVE, () => {
        SceneManager._scene.executeAutosave();
    });

    //=========================================================================
    // Window_AutosaveMessage
    //=========================================================================
    class Window_AutosaveMessage extends Window_Base {
        // The lazy singleton is needed because by the time this plugin is loaded,
        // $gameSystem is not yet set, so Window_Base.fittingHeight() will crash.
        static singleton = null;
        static get instance() {
            if (!this.singleton)
                this.singleton = new Window_AutosaveMessage();

            return this.singleton;
        }

        initialize(rect) {
            super.initialize(rect || new Rectangle(0, 0, 360, this.fittingHeight(1)));

            this.opacity = 0;
            this.reset();
        }

        reset() {
            if (this.parent) {
                this.parent.removeChild(this);
            }
            if (this.closingTimeout) {
                clearTimeout(this.closingTimeout);
                this.closingTimeout = null;
            }
            this.contentsOpacity = 0;
            this.isFadingIn = false;
            this.isFadingOut = false;
        }

        addTo(parent) {
            this.reset();
            parent.addWindow(this);
        }

        update() {
            super.update();
            if (this.isFadingIn) {
                this.contentsOpacity += 16;
                this.isFadingIn = this.contentsOpacity < 255;
            } else if (this.isFadingOut) {
                this.contentsOpacity -= 16;
                if (!this.contentsOpacity)
                    this.reset();
            }
        }

        show(message) {
            if (this.closingTimeout)
                clearTimeout(this.closingTimeout);

            this.drawMessage(message);
            this.isFadingIn = true;
            this.isFadingOut = false;
            this.closingTimeout = setTimeout(() => {
                this.isFadingIn = false;
                this.isFadingOut = true;
            }, 2500);
        }

        drawMessage(message) {
            this.contents.clear();
            let width = this.contentsWidth();
            this.drawBackground(0, 0, width, this.lineHeight());
            this.drawText(message, 0, 0, width, 'left');
        }

        drawBackground(x, y, width, height) {
            Window_MapName.prototype.drawBackground.call(this, x, y, width, height);
        }
    }

    //=========================================================================
    // Scene_Base
    //=========================================================================
    let Scene_Base_executeAutosave = Scene_Base.prototype.executeAutosave;
    Scene_Base.prototype.executeAutosave = function () {
        if (parameters.preserveSaveCount)
            this._saveCount--;

        Scene_Base_executeAutosave.call(this);

        if (parameters.displayAutosaveWindow) {
            Window_AutosaveMessage.instance.addTo(this);
            Window_AutosaveMessage.instance.show(MESSAGE_SAVING);
        }
    }

    let Scene_Base_onAutosaveSuccess = Scene_Base.prototype.onAutosaveSuccess;
    Scene_Base.prototype.onAutosaveSuccess = function () {
        Scene_Base_onAutosaveSuccess.call(this);

        if (parameters.displayAutosaveWindow)
            Window_AutosaveMessage.instance.show(MESSAGE_SAVE_SUCCESS);
    }

    let Scene_Base_onAutosaveFailure = Scene_Base.prototype.onAutosaveFailure;
    Scene_Base.prototype.onAutosaveFailure = function () {
        Scene_Base_onAutosaveFailure.call(this);

        if (parameters.displayAutosaveWindow)
            Window_AutosaveMessage.instance.show(MESSAGE_SAVE_FAILURE);
    }

    //=========================================================================
    // Scene_Map
    //=========================================================================
    let Scene_Map_isAutosaveEnabled = Scene_Map.prototype.isAutosaveEnabled;
    Scene_Map.prototype.isAutosaveEnabled = function () {
        return !(NOTETAG_NO_AUTOSAVE in $dataMap.meta) && Scene_Map_isAutosaveEnabled.call(this);
    }
})();
