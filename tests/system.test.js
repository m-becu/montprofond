const { Room } = require("../src/data/room");

const { ECS } = require("../src/system");

describe('a player', () => {

    let game;
    let player;

    beforeEach(() => {
        game = new ECS.Game();
        player = game.newPlayer('Arshavin', {});
    });

    it('should have a specific set of components', () => {

        expect(player.hasComponent('name')).toBe(true);
        expect(player.hasComponent('player')).toBe(true);
        expect(player.hasComponent('location')).toBe(true);
    });

});

describe('a room', () => {

    let game;
    let player;

    beforeEach(() => {
        game = new ECS.Game();
        player = game.newPlayer('Arshavin', {});
    });

    it('should handle entity enter and leaving', () => {

        game.moveEntity(player, 'puit-d-entree');
        let room = player.components.location.room;

        expect(room.entities[player.id]).toEqual(player);

        game.moveEntity(player, 'le-portail-béant');

        expect(room.entities[player.id]).toBeUndefined();
    });

});

describe('the entity component system', () => {

    let game;
    let player;

    beforeEach(() => {
        game = new ECS.Game();
        player = game.newPlayer('Arshavin', {});
    });

    it('can create a new player entity', () => {
        expect(player.components.player.uid).toBe(0);
        expect(game.entities[player.id]).toEqual(player);
    });

    it('can move an entity to a new location', () => {
        let halaster = game.newNPC({
            name: 'Halaster',
            location: new Room({ id: 666, name: 'laboratoire-d-halaster' })
        });

        game.moveEntity(player, 'puit-d-entree');
        game.moveEntity(halaster, 'puit-d-entree');

        expect(player.components.location.room.name).toBe('puit-d-entree');
        expect(halaster.components.location.room.name).toBe('puit-d-entree');
    });

});