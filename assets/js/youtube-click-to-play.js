// Click-to-play YouTube video (BAA item 7): the player — and everything it loads
// from Google — is created only when the visitor presses play.
document.addEventListener('click', function (event) {
  var button = event.target.closest && event.target.closest('.yt-ctp');
  if (!button) return;
  var iframe = document.createElement('iframe');
  iframe.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(button.dataset.ytId) + '?rel=0&modestbranding=1&autoplay=1';
  iframe.title = button.dataset.ytTitle + ' — Triple Moon Goddess';
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  iframe.allowFullscreen = true;
  button.replaceWith(iframe);
  iframe.focus();
});
