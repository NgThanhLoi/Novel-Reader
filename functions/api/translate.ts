// functions/api/translate.ts
// Proxy dự phòng tới API dịch sangtacviet (client gọi thẳng trước; proxy này dùng khi CORS/mạng lỗi).
//   POST /api/translate  body: ajax=trans&content=...  -> text bản dịch

const UPSTREAM = 'https://sangtacviet.com/index.php?ngmar=trans&langhint=chinese';

export const onRequest = async (context: any): Promise<Response> => {
  const { request } = context;
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers });

  const form = new URLSearchParams(await request.text());
  const content = form.get('content') || '';
  if (!content || content.length > 20000) {
    return new Response('content trống hoặc quá dài', { status: 400, headers });
  }
  const r = await fetch(UPSTREAM, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ajax: 'trans', content }).toString(),
  });
  const text = await r.text();
  return new Response(text, {
    status: r.ok ? 200 : 502,
    headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
