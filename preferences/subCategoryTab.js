const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Extension.imports.utils;

const _ = imports.gettext.domain('todotxt').gettext;

/* exported SubCategoryTab */
var SubCategoryTab = GObject.registerClass({
    GTypeName: 'SubCategoryTab'
}, class SubCategoryTab extends Gtk.Box {

    _init(title) {
        super._init();
        this._visible = false;
        this._buttonBox = null;
        this._helpCreated = false;
        this.label = new Gtk.Label({
            label: _(title),
            margin_top: 0
        });
        this.orientation = Gtk.Orientation.VERTICAL;
        this.vbox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            vexpand: true,
        });
        Gtk.Box.prototype.append.call(this, this.vbox);
        this._helpWidgets = [];
    }

    _getHelpText() {
        let helpText = '';

        for (const widget in this._helpWidgets) {
            if (Object.prototype.hasOwnProperty.call(this._helpWidgets, widget)) {
                if (this._helpWidgets[widget].isVisible()) {
                    helpText = helpText + this._helpWidgets[widget]._help;
                }
            }
        }
        return helpText;
    }

    _createHelp() {
        const helpButton = new Gtk.Button({
            label: _("Help"),
        });

        this._buttonBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            halign: Gtk.Align.END,
            vexpand: true,
            valign: Gtk.Align.END
        });

        helpButton.connect('clicked', (ignored_object) => {
            const dialog = new Gtk.MessageDialog({
                buttons: Gtk.ButtonsType.OK,
                text: _(this._getHelpText()),
                message_type: Gtk.MessageType.INFO
            });
            dialog.connect('response', (dialog, ignored_response_id) => {
                dialog.destroy();
            });
            dialog.show();
        });
        this._buttonBox.append(helpButton);
        this.vbox.append(this._buttonBox);
    }

    _updateVisibility() {
        this._visible = false;
        let child = this.vbox.get_first_child();
        while (Utils.isValid(child)) {
            try {
                this._visible = this._visible || child.isVisible();
            } finally {
                child = child.get_next_sibling();
            }
        }
        let buttonBoxVisible = false;
        for (const widget in this._helpWidgets) {
            if (Object.prototype.hasOwnProperty.call(this._helpWidgets,widget)) {
                buttonBoxVisible = buttonBoxVisible || this._helpWidgets[widget].isVisible();
            }
        }
        if (buttonBoxVisible) {
            if (!this._helpCreated) {
                this._createHelp();
                this._helpCreated = true;
            }
            this._buttonBox.show();
        } else {
            if (this._buttonBox !== null) {
                this._buttonBox.hide();
            }
        }
    }

    isVisible() {
        this._updateVisibility();
        return this._visible;
    }

    add(child) {
        if (child === null) {
            return;
        }
        if (child instanceof Extension.imports.preferences.helpWidget.HelpWidget) {
            this._helpWidgets.push(child);
            return;
        }

        child.insert_before(this.vbox, this._buttonBox);
        this._updateVisibility();
    }

    remove(child) {
        if (child === null) {
            return;
        }
        this.vbox.remove(child);
        this._updateVisibility();
    }

    getTitle() {
        return this.label;
    }
});

/* vi: set expandtab tabstop=4 shiftwidth=4: */
