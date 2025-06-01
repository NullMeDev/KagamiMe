export async function onRequest(context) {
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': 'https://nullme.lol',
        'Access-Control-Allow-Methods': 'GET',
        'Content-Type': 'application/json',
    };

    try {
        // Fetch status from KV storage
        const kvStatus = await context.env.BOT_STATUS.get('current_status', { type: 'json' });
        if (!kvStatus) {
            throw new Error('Status not found');
        }

        return new Response(JSON.stringify(kvStatus), { headers });
    } catch (error) {
        return new Response(JSON.stringify({
            error: 'Internal Server Error',
            message: error.message
        }), {
            status: 500,
            headers
        });
    }
}
