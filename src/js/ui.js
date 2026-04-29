const tooltip = d3.select('body').append('div').attr('class', 'tooltip');

export function showTip(event, html, below = false) {
  tooltip.html(html).style('left', event.clientX + 'px').style('top', event.clientY + 'px').style('opacity', 1);
  tooltip.style('transform', below ? 'translate(-50%, 18px)' : 'translate(-50%, calc(-100% - 18px))');
}

export function hideTip() {
  tooltip.style('opacity', 0);
}