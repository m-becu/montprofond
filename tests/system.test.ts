import { Entity, Game, LocationComponent, TableSystem } from '../src/system';

describe('undermountain', () => {

    let game: Game;
    let entity: Entity;

    beforeAll(() => {});

    beforeEach(() => {
        game = new Game();
        entity = new Entity();
    });

    describe('the entity-component system', () => {

        it('should create entities with unique ids', () => {
            let entities = [];
            let testArr = [1, 1, 2, 4, 8, 16];
            let isDuplicateExist = (arr: any[]) => new Set(arr).size !== arr.length;
            
            for (let i=0;i<10000;i++) { entities.push(new Entity()) };

            expect(isDuplicateExist(testArr)).toBeTruthy();
            expect(isDuplicateExist(entities)).toBeFalsy();
        });
        
    });

    describe('the room actions system', () => {

        it('should attribute the right action to the room object', () => {
            let exampleRoom = game.rooms["puit-d-entrée"];
            let nAction = exampleRoom.actions.length;

            expect(exampleRoom.name).toBe("puit-d-entrée");
            for (let i=0; i<nAction-1; i++) {
                expect(exampleRoom.gameActions[i].run).toBeInstanceOf(Function);
                expect(typeof exampleRoom.gameActions[i].run({ entity })).toBeDefined();
                expect(typeof exampleRoom.gameActions[i].run({ entity }).desc).toBe('string');
            }
        });
    });

    describe('the movement system', () => {

        it('can move an entity from room to room', async () => {
            entity.addComponent(new LocationComponent(game.rooms['limbes']));
            
            await game.moveEntity(entity, 'le-portail-béant');

            expect(entity.components.location.value.name).toBe('le-portail-béant');
        });

    });

    describe('the tables system', () => {

        it('can return a random trinket', () => {
            let contextTable = new TableSystem();
            let randomTrinkets = [];
            let n = 10000;
            
            for (let i=0;i<n;i++) {
                let newTrinketItem = contextTable.getRandomTrinket();
                randomTrinkets.push(newTrinketItem);
                expect(newTrinketItem.name).toBeDefined();
            };

            expect(randomTrinkets).toBeDefined();
            expect(randomTrinkets.length).toBe(n);
        });

    });

});
