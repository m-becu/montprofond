import { Entity } from "../system";

export class Item {

    entity: Entity;

    id: string;
    name: string;
    desc: string;

    constructor(entity: Entity) {

        const { id, components } = entity;
        const { name, desc } = components;

        this.entity = entity;

        this.id = id;
        this.name = name.value;
        this.desc = desc.value;

    };

};