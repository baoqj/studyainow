export default {
  fetch(request: Request) {
    const url = new URL(request.url);
    url.hostname = 'aibao.me';
    url.protocol = 'https:';
    return Response.redirect(url.toString(), 301);
  },
};
