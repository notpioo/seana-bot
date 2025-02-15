// lib/commands/crafting.js
const Crafting = require('../../database/models/Crafting');
const Materials = require('../../database/models/Materials');
const Fish = require('../../database/models/Fish');

// Handler untuk command .crafting
async function craftingHandler(sock, msg) {
    try {
        const recipes = await Crafting.find();
        if (!recipes.length) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Belum ada resep crafting yang tersedia!',
                quoted: msg
            });
            return;
        }

        let craftingList = '📜 *DAFTAR RESEP CRAFTING*\n\n';
        
        for (const recipe of recipes) {
            craftingList += `*${recipe.name}*\n`;
            craftingList += `📝 ${recipe.description}\n`;
            craftingList += '🧪 Bahan yang dibutuhkan:\n';
            
            recipe.ingredients.forEach(ing => {
                craftingList += `- ${ing.item} x${ing.quantity}\n`;
            });
            
            craftingList += `\n`;
        }

        craftingList += '\n*Cara Crafting:*\n';
        craftingList += '».craft <nama_item>';

        await sock.sendMessage(msg.key.remoteJid, {
            text: craftingList,
            quoted: msg
        });

    } catch (error) {
        console.error('Error in craftingHandler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat menampilkan resep crafting',
            quoted: msg
        });
    }
}

// Handler untuk command .craft
async function craftHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const itemName = msg.message?.conversation?.split(' ').slice(1).join(' ') || 
                        msg.message?.extendedTextMessage?.text?.split(' ').slice(1).join(' ');

        if (!itemName) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Masukkan nama item yang ingin di craft!\n\nContoh: .craft fishnet',
                quoted: msg
            });
            return;
        }

        // Get recipe and user materials
        const recipe = await Crafting.findOne({ name: itemName.toLowerCase() });
        let userMaterials = await Materials.findOne({ userId: senderJid });

        if (!recipe) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Resep crafting tidak ditemukan!',
                quoted: msg
            });
            return;
        }

        // Create materials inventory if doesn't exist
        if (!userMaterials) {
            userMaterials = await Materials.create({
                userId: senderJid,
                materials: []
            });
        }

        // Check ingredients
        const missingIngredients = [];
        for (const ingredient of recipe.ingredients) {
            const userMaterial = userMaterials.materials.find(mat => mat.name === ingredient.item);
            if (!userMaterial || userMaterial.quantity < ingredient.quantity) {
                missingIngredients.push(ingredient);
            }
        }

        if (missingIngredients.length > 0) {
            let message = '❌ Bahan tidak cukup!\n\nBahan yang kurang:\n';
            missingIngredients.forEach(ing => {
                const userMaterial = userMaterials.materials.find(mat => mat.name === ing.item);
                const currentQty = userMaterial ? userMaterial.quantity : 0;
                message += `- ${ing.item}: ${currentQty}/${ing.quantity}\n`;
            });
            await sock.sendMessage(msg.key.remoteJid, {
                text: message,
                quoted: msg
            });
            return;
        }

        // Remove ingredients from materials
        for (const ingredient of recipe.ingredients) {
            const materialIndex = userMaterials.materials.findIndex(mat => mat.name === ingredient.item);
            userMaterials.materials[materialIndex].quantity -= ingredient.quantity;
            if (userMaterials.materials[materialIndex].quantity <= 0) {
                userMaterials.materials.splice(materialIndex, 1);
            }
        }

        // If crafting fishnet, add it to Fish inventory
        if (recipe.result.item === 'fishnet') {
            let fishData = await Fish.findOne({ jid: senderJid });
            if (fishData) {
                const fishnetRod = {
                    name: 'fishnet',
                    durability: 100
                };

                // Add to rods array if doesn't exist
                const hasRod = fishData.inventory.rods.some(rod => rod.name === 'fishnet');
                if (!hasRod) {
                    fishData.inventory.rods.push(fishnetRod);
                    await fishData.save();
                }
            }
        }

        await userMaterials.save();

        // Send success message
        await sock.sendMessage(msg.key.remoteJid, {
            text: `✨ Crafting berhasil!\n\nBerhasil membuat ${recipe.result.item} x${recipe.result.quantity}\n${recipe.result.item === 'fishnet' ? '\nFishnet telah ditambahkan ke inventaris memancing kamu!' : ''}`,
            quoted: msg
        });

    } catch (error) {
        console.error('Error in craftHandler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat melakukan crafting',
            quoted: msg
        });
    }
}

// Initial recipe for fishnet
async function createFishnetRecipe() {
    try {
        const existingRecipe = await Crafting.findOne({ name: 'fishnet' });
        if (!existingRecipe) {
            await Crafting.create({
                name: 'fishnet',
                description: 'Jala untuk menangkap ikan dalam jumlah banyak',
                ingredients: [
                    { item: 'kayu', quantity: 8 },
                    { item: 'jaring', quantity: 1 }
                ],
                result: {
                    item: 'fishnet',
                    quantity: 1
                }
            });
            console.log('Fishnet recipe created successfully');
        }
    } catch (error) {
        console.error('Error creating fishnet recipe:', error);
    }
}

module.exports = {
    craftingHandler,
    craftHandler,
    createFishnetRecipe
};