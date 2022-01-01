const {Gdk, Gio, Gtk, GObject} = imports.gi;

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Markup = Extension.imports.markup.Markup;
const Utils = Extension.imports.utils;

const Gettext = imports.gettext.domain('todotxt');
const _ = Gettext.gettext;

const ATTR_CHANGE_COLOR = 'colorStyling';
const ATTR_BOLD = 'bold';
const ATTR_ITALIC = 'italic';

const PriorityMarkupSetting = GObject.registerClass({
    GTypeName: 'PriorityMarkupSetting'
}, class PriorityMarkupSetting extends GObject.Object {
    _init() {
        super._init();
        this._priority = '';
        this._styleColor = false;
        this._color = 0;
        this._bold = false;
        this._italic = false;
    }

    set priority(priority) {
        if (!Utils.isValid(priority) || priority < 'A' || priority > 'Z') {
            log(`invalid priority ${priority}`);
        }
        this._priority = priority;
    }

    get priority() {
        return this._priority;
    }

    set color(color) {
        if (!Utils.isValid(color)) {
            log(`invalid color ${color}`);
        }
        this._color = color;
        this._styleColor = true;
    }

    get color() {
        return this._color;
    }

    set colorStyling(enabled) {
        if (!Utils.isValid(enabled)) {
            log(`invalid color styling setting ${enabled}`);
        }
        this._styleColor = !!enabled;
    }

    get colorStyling() {
        return this._styleColor;
    }

    set bold(enabled) {
        if (!Utils.isValid(enabled)) {
            log(`invalid bold setting ${enabled}`);
        }
        this._bold = !!enabled;
    }

    get bold() {
        return this._bold;
    }

    set italic(enabled) {
        if (!Utils.isValid(enabled)) {
            log(`invalid italic setting ${enabled}`);
        }
        this._italic = !!enabled;
    }

    get italic() {
        return this._italic;
    }

    print() {
        return `Prio: ${this.priority}, color: ${this._styleColor} ${this.color},
            bold: ${this.bold}, italic: ${this.italic}`;
    }
});

/* exported PriorityMarkupWidget */
var PriorityMarkupWidget = GObject.registerClass({
    GTypeName: 'PriorityMarkupWidget'
}, class PriorityMarkupWidget extends Extension.imports.preferences.preferenceWidget.PreferenceWidget {

    _removePriorityStyle(priority) {
        if (priority === null) {
            log('Priority can not be null');
            return;
        }
        delete this.prioritiesMarkup[priority];
        this._settings.set('priorities-markup', this.prioritiesMarkup);
    }

    _updatePriorityStyling(priority, change_color, color, bold, italic, replace_prio) {
        if (priority === null) {
            log('Priority can not be null');
            return;
        }
        var currentValue = this.prioritiesMarkup[priority];
        if (typeof currentValue == 'undefined') {
            // create new tuple with default values
            this.prioritiesMarkup[priority] = new Markup();
            currentValue = this.prioritiesMarkup[priority];
        }
        if (change_color !== null) {
            if (change_color === true) {
                if (color !== null) {
                    currentValue.colorFromString = color;
                }
            }
            currentValue.changeColor = change_color;
        }
        if (bold !== null) {
            currentValue.bold = bold;
        }
        if (italic !== null) {
            currentValue.italic = italic;
        }
        if (replace_prio != priority) {
            if ((replace_prio !== null) && (replace_prio !== undefined)) {
                delete this.prioritiesMarkup[replace_prio];
            }
        }
        this._settings.set('priorities-markup', this.prioritiesMarkup);
    }


    _checkPriorityCondition(model, check_function, message, priorityToBeAdded) {
        let result = true;
        const priority = '@';
        for (let i = 0; i < model.get_n_items(); i++) {
            result = result && check_function(model.get_item(i).priority);
            if (!result) {
                break;
            }
        }

        if (result && Utils.isValid(priorityToBeAdded)) {
            result = result && check_function(priorityToBeAdded);
        }
        if (!result) {
            const dialog = new Gtk.MessageDialog({
                buttons: Gtk.ButtonsType.OK,
                text: `${message}: ${priority}`,
                message_type: Gtk.MessageType.ERROR
            });
            dialog.connect('response', (dialog, ignored_response) => {
                dialog.destroy();
            });
            dialog.show();
            return false;
        }
        return true;
    }

    _checkForInvalidPriorities(priorityToBeAdded) {
        return this._checkPriorityCondition(this.model, (priority) => {
            return (/^[A-Z]$/).test(priority);
        },
        _("Wrong priority"),
        priorityToBeAdded);
    }

    _checkForDuplicatePriorities(priorityToBeAdded) {
        const seenPriorities = [];
        if (Utils.isValid(priorityToBeAdded)) {
            seenPriorities.push(priorityToBeAdded);
        }
        for (let i = 0; i < this.model.get_n_items(); i++) {
            const priority = this.model.get_item(i).priority;
            if (!seenPriorities.includes(priority)) {
                seenPriorities.push(priority);
            } else {
                const dialog = new Gtk.MessageDialog({
                    buttons: Gtk.ButtonsType.OK,
                    text: _("Duplicate priority: %(priority)").replace('%(priority)', priority),
                    message_type: Gtk.MessageType.ERROR
                });
                dialog.connect('response', (dialog, ignored_response) => {
                    dialog.destroy();
                });
                dialog.show();
                return false;
            }
        }
        return true;
    }

    _validateModel(priorityToBeAdded) {
        if (!this._checkForDuplicatePriorities(priorityToBeAdded)) {
            return false;
        }
        if (!this._checkForInvalidPriorities(priorityToBeAdded)) {
            return false;
        }
        return true;
    }

    _updatePriorityStylingFromListItem(listItem, replace_prio) {
        if (!this._validateModel()) {
            this.model.remove(listItem.get_position());
            return;
        }
        const item = listItem.get_item();
        this._updatePriorityStyling(item.priority, item.colorStyling, item.color, item.bold, item.italic, replace_prio);
    }

    _buildToggleColumn(title, attribute) {
        const factory = new Gtk.SignalListItemFactory();
        factory.connect('setup', (factory, item) => {
            const box = new Gtk.Box();
            const MARGIN = 5;
            const toggle = new Gtk.Switch({
                hexpand: false,
                vexpand: false,
                margin_top: MARGIN,
                margin_bottom: MARGIN,
                margin_start: MARGIN,
                margin_end: MARGIN
            });
            box.append(toggle);
            item.set_child(box);
        });

        factory.connect('bind', (factory, listItem) => {
            const toggle = listItem.get_child().get_first_child();
            const item = listItem.get_item();
            toggle.active = item[attribute];
            this._connections[item] = toggle.connect('notify::active', (button) => {
                log(`setting prio ${item.priority} ${attribute} to ${button.active}`);
                item[attribute] = button.active;
                this._updatePriorityStylingFromListItem(listItem);
            });
        });

        factory.connect('unbind', (factory, item) => {
            item.get_child().get_first_child().disconnect('notify::active', this._connections[item]);
        });

        return new Gtk.ColumnViewColumn({ title, factory, expand: false, resizable: true});
    }

    _addPriorityToModel(model, priority, change_color, color, bold, italic) {
        const prioritySetting = new PriorityMarkupSetting();
        prioritySetting.colorStyling = change_color;
        prioritySetting.priority = priority;
        prioritySetting.color = color;
        prioritySetting.bold = bold;
        prioritySetting.italic = italic;
        model.append(prioritySetting);
        log(`Added ${prioritySetting.print()}`);
    }

    _buildPrioritiesFromSettings() {
        this.prioritiesMarkup = this._settings.get('priorities-markup');
        for (const markup in this.prioritiesMarkup) {
            if (Object.prototype.hasOwnProperty.call(this.prioritiesMarkup,markup)) {
                this._addPriorityToModel(this.model,
                    markup,
                    this.prioritiesMarkup[markup].changeColor,
                    this.prioritiesMarkup[markup].color.to_string(),
                    this.prioritiesMarkup[markup].bold,
                    this.prioritiesMarkup[markup].italic);
            }
        }
    }

    _init(setting, settings) {
        super._init(setting, settings, true);
        this.spacing = 6;
        this.orientation = Gtk.Orientation.VERTICAL;
        this.box.orientation = Gtk.Orientation.VERTICAL;

        this._connections = {};

        this.model = new Gio.ListStore({item_type: PriorityMarkupSetting});

        this.selectionModel = new Gtk.SingleSelection({ model: this.model });

        const columnView = new Gtk.ColumnView({model: this.selectionModel});

        const PRIO_LENGTH = 1;

        var prioFactory = new Gtk.SignalListItemFactory();
        prioFactory.connect('setup', (factory, item) => {
            const entry = new Gtk.Entry();
            entry.set_max_length(PRIO_LENGTH);
            item.set_child(entry);
        });
        prioFactory.connect('bind', (factory, item) => {
            const entry = item.get_child();
            item.get_child().get_buffer().set_text(item.get_item().priority, PRIO_LENGTH);
            this._connections[item] = entry.get_buffer().connect('inserted-text',
                (ignored_entry, ignored_position, chars, n_chars) => {
                    if (n_chars > PRIO_LENGTH) {
                        log('Something went wrong');
                        return;
                    }
                    const oldPrio = item.get_item().priority;
                    item.get_item().priority = chars;
                    this._updatePriorityStylingFromListItem(item, oldPrio);
                });
        }
        );

        prioFactory.connect('unbind', (factory, item) => {
            item.get_child().disconnect('notify::active', this._connections[item]);
        });

        const prioCol = new Gtk.ColumnViewColumn({title: _("Priority"), factory: prioFactory});
        columnView.append_column(prioCol);

        columnView.append_column(this._buildToggleColumn(_("Change color"), ATTR_CHANGE_COLOR));
        var colorFactory = new Gtk.SignalListItemFactory();
        colorFactory.connect('setup', (factory, item) => {
            item.set_child(new Gtk.ColorButton({modal: true}));
        });
        colorFactory.connect('bind', (factory, item) => {
            const colorButton = item.get_child();
            const color = new Gdk.RGBA();
            color.parse(item.get_item().color);
            colorButton.set_rgba(color);
            this._connections[item] = colorButton.connect('color-set', () => {
                const oldColor = new Gdk.RGBA();
                oldColor.parse(item.get_item().color);
                const newColor = colorButton.get_rgba();
                item.get_item().color = newColor.to_string();
                this._updatePriorityStylingFromListItem(item);
            });
        }
        );

        const colorCol = new Gtk.ColumnViewColumn({title: _("Color"), factory: colorFactory});
        columnView.append_column(colorCol);
        columnView.append_column(this._buildToggleColumn(_("Bold"), ATTR_BOLD));
        columnView.append_column(this._buildToggleColumn(_("Italic"), ATTR_ITALIC));

        const MIN_SCROLLER_HEIGHT = 200;
        const scroller = new Gtk.ScrolledWindow();
        scroller.set_child(columnView);
        scroller.set_min_content_height(MIN_SCROLLER_HEIGHT);
        this.box.append(scroller);

        this._buildPrioritiesFromSettings();

        const toolbar = new Gtk.Box();
        toolbar.add_css_class('toolbar');

        const addButton = new Gtk.Button({
            icon_name: 'list-add',
            label: _("Add style")
        });
        toolbar.append(addButton);
        addButton.connect('clicked', () => {
            const dialog = new Gtk.MessageDialog({
                buttons: Gtk.ButtonsType.OK_CANCEL,
                text: _("Please enter the priority"),
                message_type: Gtk.MessageType.QUESTION,
                title: _("New priority style"),
            });
            const dialogbox = dialog.get_content_area();
            const userentry = new Gtk.Entry();
            dialogbox.append(userentry);
            dialog.connect('response', (dialog, response) => {
                const priority = userentry.get_text();
                if ((response == Gtk.ResponseType.OK) && (priority !== '')) {
                    if (this._validateModel(priority)) {
                        const item = new PriorityMarkupSetting();
                        item.priority = priority;
                        item.changeColor = false;
                        item.color = 'rgb(255,255,255)';
                        item.bold = false;
                        item.italic = false;
                        this.model.append(item);
                    }
                }
                dialog.destroy();
            });
            dialog.show();
        });
        const deleteButton = new Gtk.Button({
            icon_name: 'edit-delete',
            label: _("Delete")
        });
        toolbar.append(deleteButton);
        deleteButton.connect('clicked', () => {
            const selected = this.selectionModel.get_selected();
            if (selected === Gtk.INVALID_LIST_POSITION) {
                return;
            }
            this._removePriorityStyle(this.model.get_item(selected).priority);
            this.model.remove(selected);
        });
        this.box.append(toolbar);
    }
});

/* vi: set expandtab tabstop=4 shiftwidth=4: */
