const { Room } = require("../src/classes/room");
const { Item } = require("../src/classes/item");
const { Player } = require("../src/classes/player");

const { ECS } = require("../src/system");

describe('undermountain', () => {

    let game;
    let entity;

    beforeAll(() => {});

    beforeEach(() => {
        game = new ECS.Game();
        entity = new ECS.Entity();
    });

    describe('the entity-component system', () => {

        it('should create entities with unique ids', () => {
            let entities = [];
            let testArr = [1, 1, 2, 4, 8, 16];
            let isDuplicateExist = arr => new Set(arr).size !== arr.length;
            
            for (i=0;i<10000;i++) { entities.push(new ECS.Entity()) };

            expect(isDuplicateExist(testArr)).toBeTruthy();
            expect(isDuplicateExist(entities)).toBeFalsy();
        });

        it('should be able to create new players', () => {

            expect(game.newPlayer('Arshavin', {id:0})).toBeInstanceOf(Player);
        });
        
    });

    describe('the room actions system', () => {

        it('should attribute the right action to the room object', () => {
            let exampleRoom = game.rooms["puit-d-entrée"];

            expect(exampleRoom.name).toBe("puit-d-entrée");
            expect(exampleRoom.gameActions[0].run).toBeInstanceOf(Function);
            expect(typeof exampleRoom.gameActions[0].run()).toBe('string');
        });
    });

    describe('the movement system', () => {

        it('can move an entity from room to room', async () => {
            entity.addComponent(new ECS.Components.Location(game.rooms['limbes']));
            
            await game.moveEntity(entity, 'le-portail-béant');

            expect(entity.components.location.room.name).toBe('le-portail-béant');
        });

    });

    describe('the tables system', () => {

        it('can return a random trinket', () => {
            let contextTable = new ECS.Systems.Tables(entity, game.rooms['limbes']);
            let randomTrinkets = [];
            let n = 10000;
            
            for (i=0;i<n;i++) {
                let newTrinketItem = contextTable.getTrinket();
                randomTrinkets.push(newTrinketItem);
                expect(newTrinketItem.name).toBeDefined();
            };

            expect(randomTrinkets).toBeDefined();
            expect(randomTrinkets.length).toBe(n);
        });

    });

});
