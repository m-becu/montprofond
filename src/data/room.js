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
    trigger(triggerName, entity) {
        switch (triggerName) {
            case 'OnEnter':
                this.entities[entity.id] = entity;
                if (entity.hasComponent('member') && this.channel) {
                    this.channel.permissionOverwrites.create(entity.components.member.value, { 
                        VIEW_CHANNEL: true 
                    });
                };
                break;
        
            case 'OnLeave':
                delete this.entities[entity.id];
                if (entity.hasComponent('member') && this.channel) {
                    this.channel.permissionOverwrites.create(entity.components.member.value, { 
                        VIEW_CHANNEL: false 
                    });
                };
                break;

            default:
                break;
        };
    };
};

exports.Room = Room;