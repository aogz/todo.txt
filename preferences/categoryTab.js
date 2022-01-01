const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Extension.imports.utils;
const _ = imports.gettext.domain('todotxt').gettext;

/* exported CategoryTab */
var CategoryTab = GObject.registerClass({
    GTypeName: 'CategoryTab'
}, class CategoryTab extends Gtk.Box {
    _init(title) {
        super._init();
        this._visible = false;
        this.orientation = Gtk.Orientation.VERTICAL;
        this.vexpand = true;
        this.spacing = 6;

        this.titleLabel = new Gtk.Label({
            label: _(title),
            xalign: 0,
            margin_top: 0
        });
    }

    _updateVisibility() {
        this._visible = false;
        let child = this.get_first_child();
        while (Utils.isValid(child)) {
            try {
                this._visible = this._visible || child.isVisible();
            } finally {
                child = child.get_next_sibling();
            }
        }
    }

    isVisible() {
        this._updateVisibility();
        return this._visible;
    }

    getTitle() {
        return this.titleLabel;
    }

    add(child) {
        super.append(child);
        this._updateVisibility();
    }
});

/* vi: set expandtab tabstop=4 shiftwidth=4: */
