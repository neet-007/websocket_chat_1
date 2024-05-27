const http = require('http');
const httpServer = http.createServer();
httpServer.listen(9090, () => console.log('server is listing in port 9090'));

const app = require('express')();
app.get('/', (req, res) => res.sendFile(__dirname + '/client.html'));
app.listen(9091, () => console.log('client is listing in port 9091'));

const clients = new Map();
const chats = new Map();
const groups = new Map();

const WebSocket = require('websocket').server;
const webSocketServer = new WebSocket({
    httpServer:httpServer
});

webSocketServer.on('request', request => {
    const connection = request.accept(null, request.origin);

    connection.on('message', message => {
        const results = JSON.parse(message.utf8Data);
        console.log(results);

        if (results.method === 'create_chat'){
            const client = clients.get(results.clientId);
            const addedClient = clients.get(results.addedClientId);
            const addedClientName = results.addedClientName;

            if(!client || !addedClient){
                return;
            };

            const chatId = guid();
            chats.set(chatId,{
                client_1:results.clientId,
                client_2:results.addedClientId,
                messages:[]
            });

            const chat = chats.get(chatId);

            const clientContacts= client.contacts
            clientContacts.set(addedClient, addedClientName);
            client.contacts = clientContacts;

            const clientChats = client.chats;
            clientChats.push({chatId:chatId, chat:chat});
            client.chats = clientChats;

            const addedClientChats = addedClient.chats;
            addedClientChats.push({chatId:chatId, chat:chat});
            addedClient.chats = clientChats;

            const payload = {
                method:'create_chat',
                chats:clientChats,
                newContactKey:results.addedClientId,
                newContactValue:addedClientName
            };

            const payload2 = {
                method:'create_chat',
                chats:addedClientChats,
                newContactKey:results.clientId,
                newContactValue:''
            }

            console.log(payload);
            console.log(payload2);
            client.connection.send(JSON.stringify(payload));
            addedClient.connection.send(JSON.stringify(payload2));
        };

        if (results.method === 'send'){
            const client = clients.get(results.clientId);
            const chat = chats.get(results.chatId);
            const message = results.message;
            const messageObj = {id:guid(), content:message, sender:results.clientId}
            console.log(chat);
            const chatMessages = chat.messages;
            chatMessages.push(messageObj);
            chat.messages = chatMessages;

            const payload = {
                method:'update',
                chatId:results.chatId,
                message:messageObj
            };

            client.connection.send(JSON.stringify(payload));
            clients.get(chat.client_1 === results.clientId ? chat.client_2 : chat.client_1).connection.send(JSON.stringify(payload));
        };

        if (results.method === 'accept_chat'){
            const client = clients.get(results.clientId);
            const chat = chats.get(results.chatId);
            const contactName = results.contactName;

            const clientContacts = client.contacts;
            client.contacts.set(results.contactId, contactName);
            client.contacts = clientContacts;

            const payload = {
                method:'accept_chat',
                newContactKey:results.contactId,
                newContactValue:contactName
            };

            client.connection.send(JSON.stringify(payload));
        };

        if (results.method === 'refresh_chat'){
            const client = clients.get(results.clientId);
            const chat = chats.get(results.chatId);

            const payload = {
                method:'refresh_chat',
                chat:{chatId:results.chatId, chat:chat}
            };

            console.log(client)
            client.connection.send(JSON.stringify(payload));
        };


    });

    const clientId = guid()
    clients.set(clientId, {connection:connection, chats:[], contacts:new Map()});

    const payload = {
        method:'connect',
        clientId:clientId
    };

    connection.send(JSON.stringify(payload));
});


const guid=()=> {
    const s4=()=> Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return `${s4() + s4()}-${s4()}-${s4()}-${s4()}-${s4() + s4() + s4()}`;
};