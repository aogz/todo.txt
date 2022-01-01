const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;

const Extension = imports.misc.extensionUtils.getCurrentExtension();

const Gettext = imports.gettext.domain('todotxt');
const _ = Gettext.gettext;

/* exported PathWidget */
var PathWidget = GObject.registerClass({
    GTypeName: 'PathWidget'
}, class PathWidget extends Extension.imports.preferences.preferenceWidget.PreferenceWidget {

    launchFileChooser(entryTarget, title, setting, settings) {
        let dialogTitle = _("Select file");
        if (title !== null) {
            dialogTitle = title;
        }
        const chooser = new Gtk.FileChooserDialog({
            title: dialogTitle,
            action: Gtk.FileChooserAction.OPEN,
            modal: true
        });

        chooser.add_button(_("Cancel"), Gtk.ResponseType.CANCEL);
        chooser.add_button(_("Open"), Gtk.ResponseType.OK);
        chooser.set_default_response(Gtk.ResponseType.OK);
        chooser.connect('response', (dialog, response_id) => {
            if (response_id === Gtk.ResponseType.OK) {
                const file = dialog.get_file();
                if (file) {
                    entryTarget.set_text(file.get_path());
                    settings.set(setting, file.get_path());
                }
            }
            dialog.destroy();
        });
        chooser.show();
    }

    _init(setting, settings) {
        super._init(setting, settings);
        this.spacing = 6;

        const locationValue = new Gtk.Entry({
            hexpand: true
        });
        locationValue.set_text(settings.get(setting));
        const locationBrowse = new Gtk.Button({
            label: _("Browse")
        });
        const focusController = new Gtk.EventControllerFocus();
        focusController.connect('leave', (ignored_object) => {
            log(`Setting ${setting} to ${locationValue.get_text()}`);
            settings.set(setting, locationValue.get_text());
        });

        locationValue.add_controller(focusController);
        locationBrowse.connect('clicked', () => {
            this.launchFileChooser(locationValue, (this._params.description), setting, settings);
        });
        locationValue.connect('activate', (ignored_object) => {
            log(`Setting ${setting} to ${locationValue.get_text()}`);
            settings.set(setting, locationValue.get_text());
        });

        this._addHelp(locationValue);

        this.box.append(locationValue);
        this.box.append(locationBrowse);
    }
});

/* vi: set expandtab tabstop=4 shiftwidth=4: */
