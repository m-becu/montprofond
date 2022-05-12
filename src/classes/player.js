class Player {
    constructor(entity) {
        const { id, components } = entity;
        const { name, location, member } = components;

        this.entity = entity;
        
        this.id = id;
        this.name = name.value;
        this.location = location.room;
        this.member = member.value;
    };
}

exports.Player = Player;