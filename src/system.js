const { Room } = require("./data/room");

var ECS = {};

// G A M E
ECS.Game = function game() {

    this.players = {};
    this.channels = {};
    this.entities = {};
    this.rooms = {};
    this.areas = {};

    var gameData = require('./data/game.json');
    for (const areaData of gameData.areas) {
        this.areas[areaData.name] = areaData;
    };
    for (const roomData of gameData.rooms) {
        this.rooms[roomData.name] = new Room(roomData);
    };

    return this;
};

ECS.Game.prototype.newPlayer = function newPlayer(name, memberData) {
    let playerEntity = new ECS.Entity();
    
    playerEntity.addComponent(new ECS.Components.Name(name));
    playerEntity.addComponent(new ECS.Components.Player(memberData));
    playerEntity.addComponent(new ECS.Components.Location());

    this.entities[playerEntity.id] = playerEntity;
    this.players[memberData.id] = playerEntity;

    return playerEntity;
};

ECS.Game.prototype.newNPC = function newNPC(npcData) {
    let entity = new ECS.Entity();

    if (npcData.name) {
        entity.addComponent(new ECS.Components.Name(npcData.name));
    }
    
    if (npcData.location) {
        entity.addComponent(new ECS.Components.Location(npcData.location));
    }

    this.entities[entity.id] = entity;
    return entity;
};

ECS.Game.prototype.newRoom = function newRoom(roomData) {
    let room = new Room(roomData);
    this.rooms[room.name] = room;
    return room;
};

ECS.Game.prototype.moveEntity = function moveEntity(entity, location) {
    if (entity.hasComponent('location') && this.rooms[location]) {

        let previousRoom = entity.components.location.room;
        previousRoom.trigger('OnLeave', entity);

        let nextRoom = this.rooms[location]
        nextRoom.trigger('OnEnter', entity);
        
        entity.components.location.room = nextRoom;
    };
    return entity;
};

// E N T I T I E S
ECS.Entity = function Entity() {
    this.id = (+new Date()).toString(16) +
        (Math.random() * 1000 * 10000 | 0).toString(16) +
        ECS.Entity.prototype._count;

    ECS.Entity.prototype._count++;
    
    this.components = {};
    
    return this;
};

ECS.Entity.prototype._count = 0;

ECS.Entity.prototype.addComponent = function addComponent(component) {
    this.components[component.name] = component;
    return this;
};

ECS.Entity.prototype.removeComponent = function removeComponent(componentName) {
    var name = componentName;
    if (typeof componentName === 'function') {
        name = componentName.prototype.name;
    }

    delete this.components[name];
    return this;
};

ECS.Entity.prototype.hasComponent = function hasComponent(componentName) {
    let res = false;
    let name = componentName;

    if (typeof componentName === 'function') {
        name = componentName.prototype.name;
    }

    if (this.components[name]) res = true;

    return res;
};

// C O M P O N E N T S
ECS.Components = {};

ECS.Components.Name = function name(value) {
    this.value = value || 'Inconnu';
    return this;
}
ECS.Components.Name.prototype.name = 'name';

ECS.Components.Player = function player(value) {
    if (!value) return;
    this.value = value;
    return this;
};
ECS.Components.Player.prototype.name = 'player';

ECS.Components.Location = function location(roomName) {
    this.room = roomName || new Room({ id: -1, name: 'limbes' });
    return this;
};
ECS.Components.Location.prototype.name = 'location';

// S Y S T E M S
ECS.Systems = {};

module.exports = { ECS };