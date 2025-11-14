import express from 'express';
import fs from 'fs-extra';
import { exec } from "child_process";
import pino from "pino";
import { Boom } from "@hapi/boom";
import crypto from 'crypto';

const router = express.Router();

// Déplacer la définition de MESSAGE après les variables dateNow/timeNow
let MESSAGE = "";

import { upload } from './mega.js';
import {
    makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers,
    DisconnectReason
} from "@whiskeysockets/baileys";

// Clear auth directory at startup
if (fs.existsSync('./session')) {
    fs.emptyDirSync('./session');
}

router.get('/', async (req, res) => {
    let num = req.query.number;

    async function DevNotBot() {
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
                        console.log("✅ Connexion WhatsApp ouverte");
                        await delay(10000);
                        
                        const options = { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        };
                        const dateNow = new Date().toLocaleDateString('fr-FR', options);
                        const timeNow = new Date().toLocaleTimeString('fr-FR');

                        // Définir MESSAGE ici avec les variables disponibles
                        MESSAGE = `-
━O *ASK-XMD* O━━━━━━━
✅ *Connexion établie*
📅 *${dateNow}*
⏰ *${timeNow}*

●▬▬▬▬๑۩۩๑▬▬▬▬▬●
□ ➠ *DEV ASK TECH*
□ ➠ *VERSION 1.1.1*
□ ➠ *BOT XMD*
●▬▬▬▬๑۩۩๑▬▬▬▬▬●
𝓛𝓮 𝓫𝓸𝓽 𝓮𝓼𝓽 𝓸𝓹𝓮𝓻𝓪𝓽𝓲𝓸𝓷𝓷𝓮𝓵  🤖 🚀
`;

                        const auth_path = './session/';
                        const user = devaskNotBot.user.id;
                        
                        console.log("👤 Utilisateur:", user);

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

                        // Vérifier si le fichier creds.json existe
                        if (!fs.existsSync(auth_path + 'creds.json')) {
                            console.log("❌ Fichier creds.json non trouvé");
                            return;
                        }

                        console.log("📤 Upload vers Mega en cours...");
                        // Upload creds.json to Mega
                        const mega_url = await upload(fs.createReadStream(auth_path + 'creds.json'), `${randomMegaId()}.json`);
                        console.log("✅ Upload Mega réussi:", mega_url);

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
                        console.log("🔑 Session string générée");

                        // Envoyer la session à l'utilisateur
                        console.log("📨 Envoi du message de session...");
                        const msgsss = await devaskNotBot.sendMessage(user, { text: sessionString });
                        console.log("✅ Message session envoyé");

                        console.log("🖼️ Envoi du message de bienvenue...");
                        await devaskNotBot.sendMessage(user, { 
                            image: { 
                                url: "https://i.ibb.co/pvk0Mctm/1e4927db575e.jpg" 
                            }, 
                            caption: MESSAGE,
                            contextInfo: {
                                mentionedJid: [user],
                                isForwarded: true,
                                forwardedNewsletterMessageInfo: {
                                    newsletterName: "𝐃𝐄𝐕 𝐀𝐒𝐊 𝐓𝐄𝐂𝐇",
                                    newsletterJid: `120363330359618597@newsletter`
                                },
                            }
                        }, { quoted: msgsss });
                        console.log("✅ Message bienvenue envoyé");

                        await delay(1000);
                        await fs.emptyDir(auth_path);
                        console.log("🧹 Session nettoyée");

                    } catch (e) {
                        console.log("❌ Error during upload or send:", e);
                    }
                }

                if (connection === "close") {
                    const reason = new Boom(lastDisconnect?.error)?.output.statusCode;
                    console.log("🔌 Connexion fermée, raison:", reason);
                    if ([DisconnectReason.connectionClosed, DisconnectReason.connectionLost, DisconnectReason.restartRequired, DisconnectReason.timedOut].includes(reason)) {
                        console.log("🔄 Reconnecting...");
                        DevNotBot().catch(console.log);
                    } else {
                        console.log('❌ Connection closed unexpectedly:', reason);
                        await delay(5000);
                        exec('pm2 restart qasim');
                    }
                }
            });

        } catch (err) {
            console.log("❌ Error in DevNotBot function:", err);
            exec('pm2 restart qasim');
            DevNotBot();
            await fs.emptyDir('./session');
            if (!res.headersSent) await res.send({ code: "Try After Few Minutes" });
        }
    }

    await DevNotBot();
});

export default router;