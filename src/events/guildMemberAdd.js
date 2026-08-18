const config = require("../config");
const { getSettings, updateSettings } = require("../utils/guildSettings");
const { createSetupEmbed, createSetupButtons } = require("../utils/setupWizard");

module.exports = {
  name: "guildMemberAdd",
  async execute(member, client) {
    const guild = member.guild;
    const settings = getSettings(guild.id);
    const security = client.security.get(guild.id) || { raidMode: false, antiNuke: true };

    const ensureSetupWizard = async () => {
      const setupChannel = guild.systemChannel || guild.channels.cache.find((ch) => ch.isTextBased() && ch.permissionsFor(guild.members.me)?.has("SendMessages"));
      if (!setupChannel || !setupChannel.isTextBased()) return;

      try {
        const messages = await setupChannel.messages.fetch({ limit: 25 });
        const existing = messages.some((msg) => msg.author.id === client.user.id && /Friendbase Setup Wizard/i.test(msg.content || "") && msg.embeds.some((embed) => embed.title?.includes("Friendbase Setup Wizard")));

        if (!existing) {
          await setupChannel.send({
            embeds: [createSetupEmbed(guild.name)],
            components: [createSetupButtons()],
          }).catch(() => null);
        }
      } catch (error) {
        console.warn("[SetupWizard] Could not ensure wizard message:", error.message);
      }
    };

    if (security.raidMode) {
      const now = Date.now();
      const recent = guild.memberJoinTimestamps || [];
      guild.memberJoinTimestamps = recent.filter((ts) => now - ts <= config.antiRaid.windowMs);
      guild.memberJoinTimestamps.push(now);

      if (guild.memberJoinTimestamps.length >= config.antiRaid.threshold) {
        const modRole = guild.roles.cache.find((role) => role.name.toLowerCase().includes("mod"));
        const everyone = guild.roles.everyone;

        for (const channel of guild.channels.cache.values()) {
          if (channel.isTextBased()) {
            await channel.permissionOverwrites.edit(everyone, { SendMessages: false }).catch(() => null);
          }
        }

        await guild.systemChannel?.send("🚨 Raid protection triggered. Message sending has been disabled temporarily.");

        if (modRole) {
          try {
            await modRole.setPermissions(modRole.permissions.bitfield | 0x00000020n, "Raid protection");
          } catch (error) {
            console.error("Failed to adjust moderator permissions:", error);
          }
        }
      }
    }

    if (settings.autorole?.enabled && settings.autorole.roleId) {
      const role = guild.roles.cache.get(settings.autorole.roleId) || guild.roles.cache.find((target) => target.name.toLowerCase() === settings.autorole.roleId.toLowerCase());
      if (role) {
        await member.roles.add(role).catch(() => null);
      }
    }

    if (settings.welcome?.enabled) {
      const channel = guild.channels.cache.get(settings.welcome.channel) || guild.channels.cache.find((target) => target.name === settings.welcome.channel);
      if (channel && channel.isTextBased()) {
        const welcomeTemplate = settings.welcome.message || "Welcome to {server}, {user}!";
        const text = welcomeTemplate
          .replace(/{server}/gi, guild.name)
          .replace(/{user}/gi, `<@${member.id}>`)
          .replace(/{mention}/gi, `<@${member.id}>`);

        await channel.send({ content: text }).catch(() => null);
      }
    }

    await ensureSetupWizard();
  },
};
