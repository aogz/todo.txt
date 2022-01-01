const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;

const _ = imports.gettext.domain('todotxt').gettext;

const Extension = imports.misc.extensionUtils.getCurrentExtension();

const ID = 0;
const DESCRIPTION = 1;
const MODIFIERS = 2;
const KEYS = 3;

const EMPTY = 0;

/* exported ShortcutWidget */
var ShortcutWidget = GObject.registerClass({
    GTypeName: 'ShortcutWidget'
}, class ShortcutWidget extends Extension.imports.preferences.preferenceWidget.PreferenceWidget {

    _init(setting, settings) {
        super._init(setting, settings, true);
        this.box.orientation = Gtk.Orientation.VERTICAL;

        const MARGIN = 5;
        const instructions = new Gtk.Label({
            label: _("Select the shortcut and then press the new combination to change it"),
            margin_top: MARGIN,
            margin_bottom: MARGIN,
            margin_start: MARGIN,
            margin_end: MARGIN
        });

        this.box.append(instructions);

        const model = new Gtk.ListStore();
        model.set_column_types([
            GObject.TYPE_STRING, GObject.TYPE_STRING, Gdk.ModifierType, GObject.TYPE_INT
        ]);

        for (const shortcut in this._params.shortcuts) {
            if (Object.prototype.hasOwnProperty.call(this._params.shortcuts,shortcut)) {
                const NEW_ROW_POSITION = 10;
                const row = model.insert(NEW_ROW_POSITION);
                const [ok, key, mods] = Gtk.accelerator_parse(settings.get(shortcut));
                model.set(row, [ID, DESCRIPTION, MODIFIERS, KEYS],
                    [shortcut, _(this._params.shortcuts[shortcut]), ok ? mods : EMPTY, ok ? key : EMPTY]);
            }
        }

        const treeview = new Gtk.TreeView({
            model
        });

        let cellrend = new Gtk.CellRendererText();
        let col = new Gtk.TreeViewColumn({
            'title': _("Function"),
        });

        col.pack_start(cellrend, true);
        col.add_attribute(cellrend, 'text', DESCRIPTION);

        treeview.append_column(col);

        cellrend = new Gtk.CellRendererAccel({
            'editable': true,
            'accel-mode': Gtk.CellRendererAccelMode.GTK
        });
        cellrend.connect('accel-edited', (renderer, path_string, accel_key, accel_mods, ignored_hw_keycode) => {
            const value = Gtk.accelerator_name(accel_key, accel_mods);

            const [succ, iterator] = model.get_iter_from_string(path_string);

            if (!succ) {
                throw new Error('Something is broken!');
            }

            const name = model.get_value(iterator, ID);

            model.set(iterator, [MODIFIERS, KEYS], [accel_mods, accel_key]);

            settings.set(name, value);
        });

        cellrend.connect('accel-cleared', (renderer, path_string) => {
            const [succ, iterator] = model.get_iter_from_string(path_string);

            if (!succ) {
                throw new Error('Something is broken!');
            }

            model.set(iterator, [KEYS], [EMPTY]);
            const name = model.get_value(iterator, ID);
            settings.set(name, '');
        });

        col = new Gtk.TreeViewColumn({
            'title': _("Key")
        });

        col.pack_end(cellrend, false);
        col.add_attribute(cellrend, 'accel-mods', MODIFIERS);
        col.add_attribute(cellrend, 'accel-key', KEYS);

        treeview.append_column(col);
        treeview.expand_all();
        this.box.append(treeview);
    }
});

/* vi: set expandtab tabstop=4 shiftwidth=4: */
