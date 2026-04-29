const tooltip = document.createElement('div');
tooltip.className = 'tooltip';
document.body.appendChild(tooltip);

export function showTip(event, html, below = false) {
  tooltip.innerHTML = html;
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
  tooltip.style.opacity = '1';
  tooltip.style.transform = below ? 'translate(-50%, 18px)' : 'translate(-50%, calc(-100% - 18px))';
}

export function hideTip() {
  tooltip.style.opacity = '0';
}
