class Item {
    constructor(entity) {
        const { id, components } = entity;
        const { name, desc } = components;

        this.entity = entity;

        this.id = id;
        this.name = name.value;
        this.desc = desc.value;
    };
}

exports.Item = Item;