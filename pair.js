const express = require('express');
const fs = require('fs-extra');
const { exec } = require("child_process");
const router = express.Router();
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const crypto = require('crypto');

const MESSAGE = process.env.MESSAGE || `
━O *ASK-DEVASKNOTBOT* O━━━━━━━
✅ *Connexion établie*
●▬▬▬▬๑۩۩๑▬▬▬▬▬●
□ ➠ *DEV ASK TECH*
□ ➠ *VERSION 1.1.1*
□ ➠ *BOT DEVASKNOTBOT*
●▬▬▬▬๑۩۩๑▬▬▬▬▬●
𝓛𝓮 𝓫𝓸𝓽 𝓮𝓼𝓽 𝓸𝓹𝓮𝓻𝓪𝓽𝓲𝓸𝓷𝓷𝓮𝓵  🤖 🚀

*SESSION SUCCESSFULLY* ✅
`;

const { upload } = require('./mega');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers,
    DisconnectReason
} = require("@whiskeysockets/baileys");

// Clear session directory at startup
if (fs.existsSync('./session')) {
    fs.emptyDirSync('./session');
}

router.get('/', async (req, res) => {
    let num = req.query.number;

    async function DevNotBotStart() {
        const { state, saveCreds } = await useMultiFileAuthState(`./session`);

        try {
            const devaskNotBot = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.macOS("Safari"),
            });

            if (!devaskNotBot.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await devaskNotBot.requestPairingCode(num);
                if (!res.headersSent) await res.send({ code });
            }

            devaskNotBot.ev.on('creds.update', saveCreds);

            devaskNotBot.ev.on("connection.update", async (update) => {
                const { connection, lastDisconnect } = update;

                if (connection === "open") {
                    try {
                        await delay(10000);

                        const session_path = './session/';
                        const user = devaskNotBot.user.id;

                        // Random Mega ID generator
                        function randomMegaId(length = 6, numberLength = 4) {
                            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                            let result = '';
                            for (let i = 0; i < length; i++) {
                                result += characters.charAt(Math.floor(Math.random() * characters.length));
                            }
                            const number = Math.floor(Math.random() * Math.pow(10, numberLength));
                            return `${result}${number}`;
                        }

                        // Upload creds.json to Mega
                        const mega_url = await upload(fs.createReadStream(session_path + 'creds.json'), `${randomMegaId()}.json`);
                        
                        // Extraire fileID et key en toute sécurité
                        let fileID, key;
                        if (mega_url.includes('#')) {
                            const parts = mega_url.split('/file/')[1].split('#');
                            fileID = parts[0];
                            key = parts[1];
                        } else {
                            fileID = mega_url.split('/file/')[1];
                            key = crypto.randomBytes(32).toString('base64'); // fallback
                        }

                        // Construire la session avec préfixe ASK-CRASHER-V1~
                        const sessionString = `ASK-CRASHER-V1~${fileID}#${key}`;

                        // Envoyer la session à l'utilisateur
                        const msgsss = await devaskNotBot.sendMessage(user, { text: sessionString });
                        await devaskNotBot.sendMessage(user, { 
                            image: { 
                                url: "https://i.ibb.co/1GwTjv6g/1898e8488a4f.jpg" 
                            }, 
                            caption: MESSAGE,
                            contextInfo: {
                               isForwarded: true,
                                mentionedJid: [user],
                                forwardedNewsletterMessageInfo: {
                                    newsletterName: "╔▒𝑫𝑬𝑽 𝑨𝑺𝑲 || 𝑻𝑬𝑪𝑯▒┘",
                                    newsletterJid: `120363330359618597@newsletter`
                                },

                            }
                        }, { quoted: msgsss });

                        await delay(1000);
                        await fs.emptyDir(session_path);

                    } catch (e) {
                        console.log("Error during upload or send:", e);
                    }
                }

                if (connection === "close") {
                    const reason = new Boom(lastDisconnect?.error)?.output.statusCode;
                    if ([DisconnectReason.connectionClosed, DisconnectReason.connectionLost, DisconnectReason.restartRequired, DisconnectReason.timedOut].includes(reason)) {
                        console.log("Reconnecting...");
                        DevNotBotStart().catch(console.log);
                    } else {
                        console.log('Connection closed unexpectedly:', reason);
                        await delay(5000);
                        exec('pm2 restart qasim');
                    }
                }
            });

        } catch (err) {
            console.log("Error in DevNotBotStart function:", err);
            exec('pm2 restart qasim');
            DevNotBotStart();
            await fs.emptyDir('./session');
            if (!res.headersSent) await res.send({ code: "Try After Few Minutes" });
        }
    }

    await DevNotBotStart();
});

module.exports = router;