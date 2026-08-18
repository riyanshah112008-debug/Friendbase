const { Events, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const crypto = require('crypto'); // Built into Node.js for generating random tokens

module.exports = (client) => {
    client.on(Events.InteractionCreate, async interaction => {
        if (!interaction.isButton()) return;
        
        if (interaction.customId.startsWith('verify_role_')) {
            const roleId = interaction.customId.split('_')[2];
            
            if (interaction.member.roles.cache.has(roleId)) {
                return interaction.reply({ content: '✅ You are already verified!', ephemeral: true });
            }

            // Generate a secure, random 16-character token
            const token = crypto.randomBytes(16).toString('hex');
            
            // Save it to the bot's memory bank
            client.verifyMap.set(token, {
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                roleId: roleId
            });

            // Make the token expire after 10 minutes to prevent sharing
            setTimeout(() => {
                client.verifyMap.delete(token);
            }, 10 * 60 * 1000); 

            // Create the link to your Render web server
            const appUrl = process.env.RENDER_EXTERNAL_URL || 'https://manager-bot-hglf.onrender.com';
            const verifyUrl = `${appUrl}/verify?token=${token}`;

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Click here to verify on website')
                    .setStyle(ButtonStyle.Link)
                    .setURL(verifyUrl)
            );

            return interaction.reply({ 
                content: '🔒 **Security Check:** To protect against bots, please complete your verification on our secure website. \n\n*(This private link will expire in 10 minutes).*', 
                components: [row],
                ephemeral: true // Only the user can see this link
            });
        }
    });
};
