const orbitLines = document.getElementById('orbit-lines');
for (let i = 0; i < 24; i += 1) {
  const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
  Object.entries({cx:250,cy:250,rx:183,ry:67,transform:`rotate(${i * 7.5} 250 250)`,fill:'none',stroke:'#c3f77c','stroke-opacity':i % 3 === 0 ? '.65' : '.22','stroke-width':'.8'}).forEach(([key, value]) => ellipse.setAttribute(key, value));
  orbitLines.appendChild(ellipse);
}
const input = document.getElementById('command-input');
const output = document.getElementById('terminal-output');
const commands = {
  about: 'AI & Software Engineer. PhD. Based in Warsaw. I turn complex ideas into practical products and reliable systems.',
  work: 'Explore my code and projects on GitHub.',
  contact: 'Have an idea to explore? Find me on LinkedIn.',
  help: 'Available commands: about, work, contact, hello, clear, help.',
  hello: 'Hi, I’m Taras. Thanks for stopping by.'
};
const destinations = {work:['View repositories ↗','https://github.com/tarashor?tab=repositories'],contact:['Connect on LinkedIn ↗','https://www.linkedin.com/in/tarashoryachko']};
function runCommand(value) {
  const command = value.trim().toLowerCase();
  if (!command) return;
  output.replaceChildren();
  input.value = '';
  if (command === 'clear') return;
  const line = document.createElement('p');
  const prompt = document.createElement('span');
  prompt.className = 'prompt';
  prompt.textContent = '❯';
  line.append(prompt, document.createTextNode(` ${command}`));
  const response = document.createElement('p');
  response.className = 'response';
  response.textContent = Object.hasOwn(commands, command) ? commands[command] : 'Unknown command. Type help to see what you can do.';
  if (Object.hasOwn(destinations, command)) {
    const link = document.createElement('a');
    link.textContent = destinations[command][0];
    link.href = destinations[command][1];
    response.append(document.createElement('br'), link);
  }
  output.append(line, response);
}
document.getElementById('command-form').addEventListener('submit', event => {event.preventDefault();runCommand(input.value);});
document.querySelectorAll('[data-command]').forEach(button => button.addEventListener('click', () => runCommand(button.dataset.command)));
function updateTime() {
  const now = new Date();
  const clock = document.getElementById('local-time');
  clock.dateTime = now.toISOString();
  clock.textContent = new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/Warsaw',hour:'2-digit',minute:'2-digit',hour12:false}).format(now) + ' local time';
}
updateTime();
setInterval(updateTime, 60000);
