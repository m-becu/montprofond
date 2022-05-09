class Room {
    constructor(roomData) {
        const { id, name, area, desc, exits } = roomData;
        this.id = id;
        this.name = name;
        this.area = area;
        this.desc = desc;
        this.exits = exits;
        this.channel = null;
        this.entities = {};
    };
    async trigger(triggerName, entity) {
        switch (triggerName) {
            case 'OnEnter':
                this.entities[entity.id] = entity;
                if (entity.hasComponent('member') && this.channel) {
                    this.channel.permissionOverwrites.create(entity.components.member.value, { 
                        VIEW_CHANNEL: true 
                    });
                };
                if (entity.hasComponent('name') && this.channel) {
                    await this.channel.send(`➡ ${entity.components.name.value} est entré.`);
                };
                break;
        
            case 'OnLeave':
                delete this.entities[entity.id];
                if (entity.hasComponent('member') && this.channel) {
                    this.channel.permissionOverwrites.create(entity.components.member.value, { 
                        VIEW_CHANNEL: false 
                    });
                };
                if (entity.hasComponent('name') && this.channel) {
                    await this.channel.send(`➡ ${entity.components.name.value} est parti.`);
                };
                break;

            default:
                break;
        };
    };
};

exports.Room = Room;