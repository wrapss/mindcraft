import { strictFormat } from '../utils/text.js';

export class Local {
    constructor(model_name, url) {
        this.model_name = model_name;
        this.url = url || 'http://127.0.0.1:11442';
        this.chat_endpoint = '/api/chat';
        this.embedding_endpoint = '/api/embeddings';
        this.context_length = 8192;
        this.num_predict = 2048;
        this.temperature = 0.3;
    }

    async sendRequest(turns, systemMessage) {
        let model = this.model_name || 'llama3';
        let messages = strictFormat(turns);
        messages.unshift({ role: 'system', content: systemMessage });
        let res = null;
        try {
            console.log(`Awaiting local response... (model: ${model})`)
            res = await this.send(this.chat_endpoint, { model: model, messages: messages, stream: false, temperature: this.temperature, options: { num_ctx: this.context_length, num_predict: this.num_predict } });
            if (res)
                res = res['message']['content'];
        }
        catch (err) {
            if (err.message.toLowerCase().includes('context length') && turns.length > 1) {
                console.log('Context length exceeded, trying again with shorter context.');
                return await sendRequest(turns.slice(1), systemMessage, stop_seq);
            } else {
                console.log(err);
                res = 'My brain disconnected, try again.';
            }
        }
        return res;
    }

    async embed(text) {
        let model = this.model_name || 'nomic-embed-text';
        let body = { model: model, prompt: text };
        let res = await this.send(this.embedding_endpoint, body);
        return res['embedding']
    }

    async send(endpoint, body) {
        const url = new URL(endpoint, this.url);
        let method = 'POST';
        let headers = new Headers();
        headers.append('X-App-Name', "mindcraft");
        const request = new Request(url, { method, headers, body: JSON.stringify(body) });
        let data = null;
        try {
            const res = await fetch(request);
            if (res.ok) {
                data = await res.json();
            } else {
                throw new Error(`Ollama Status: ${res.status}`);
            }
        } catch (err) {
            console.error('Failed to send Ollama request.');
            console.error(err);
        }
        return data;
    }
}
