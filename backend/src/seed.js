import { db } from './db.js';

const CATEGORIES = [
  ['daily', 'Daily English'],
  ['it', 'IT English'],
  ['linux', 'Linux'],
  ['docker', 'Docker'],
  ['networking', 'Networking'],
  ['servers', 'Servers'],
  ['monitoring', 'Monitoring'],
  ['security', 'Cybersecurity'],
  ['programming', 'Programming'],
  ['support', 'Customer Support'],
  ['business', 'Business English'],
  ['email', 'Emails'],
  ['meetings', 'Meetings'],
  ['travel', 'Travel'],
  ['technology', 'Technology'],
  ['general', 'General English']
];

const EXERCISES = [
  ['daily', 'A1', 'I usually get up at six in the morning.', 'I usually get up on six in the morning.'],
  ['daily', 'A1', 'She drinks a cup of coffee before work.', null],
  ['daily', 'A2', 'We are going to the supermarket after lunch.', 'We going to the supermarket after lunch.'],
  ['daily', 'A2', 'He has not finished his homework yet.', null],
  ['daily', 'B1', 'I have been living in this city for three years.', 'I am living in this city since three years.'],
  ['daily', 'B1', 'If it rains tomorrow, we will stay at home.', null],
  ['daily', 'B2', 'I would rather walk than take the bus today.', null],
  ['daily', 'B2', 'By the time I arrived, the shop had already closed.', 'By the time I arrived, the shop has already closed.'],

  ['it', 'A2', 'The computer starts automatically after a power failure.', null],
  ['it', 'B1', 'I need to configure the server before the customer arrives tomorrow.', 'I need configure the server before the customer arrive tomorrow.'],
  ['it', 'B1', 'Please check whether the software is up to date.', null],
  ['it', 'B1', 'The user cannot log in because the account is locked.', 'The user cannot log in because the account are locked.'],
  ['it', 'B2', 'We have to roll back the update as soon as possible.', null],
  ['it', 'B2', 'The technician replaced the hard drive and restored the backup.', null],
  ['it', 'B2', 'This issue only occurs when the client uses an old browser version.', null],
  ['it', 'C1', 'The migration has to be scheduled outside of business hours.', 'The migration has to be scheduled outside of business hour.'],
  ['it', 'C1', 'We should document every change so that the team can reproduce it later.', null],

  ['linux', 'A2', 'Check how much disk space is available on the server.', 'Check how much disk space are available on the server.'],
  ['linux', 'B1', 'You have to change the file permissions before you run the script.', null],
  ['linux', 'B1', 'The service failed to start because the configuration file is missing.', null],
  ['linux', 'B1', 'Use the command line to list all running processes.', null],
  ['linux', 'B2', 'The package manager could not resolve the dependencies.', null],
  ['linux', 'B2', 'I mounted the external drive to the data directory.', 'I mounted the external drive on the data directory.'],
  ['linux', 'B2', 'The cron job runs every night at two in the morning.', null],
  ['linux', 'C1', 'The log rotation keeps the last seven days of system logs.', null],

  ['docker', 'B1', 'The Docker container restarts automatically after the server reboots.', 'The Docker container restart automatically after the server reboot.'],
  ['docker', 'B1', 'Build the image before you push it to the registry.', null],
  ['docker', 'B1', 'The application runs in an isolated container.', 'The application run in a isolated container.'],
  ['docker', 'B2', 'All persistent data is stored in a named volume.', null],
  ['docker', 'B2', 'The container exposes port eight thousand to the host.', null],
  ['docker', 'B2', 'We use a multi stage build to keep the image small.', null],
  ['docker', 'C1', 'The healthcheck marks the container as unhealthy after three failed attempts.', null],
  ['docker', 'C1', 'Environment variables are injected at runtime instead of being written into the image.', null],

  ['networking', 'A2', 'The device cannot reach the gateway.', null],
  ['networking', 'B1', 'Please check the network cable and the switch port.', null],
  ['networking', 'B1', 'The firewall blocks all incoming connections on this port.', 'The firewall block all incoming connections in this port.'],
  ['networking', 'B2', 'The router assigns an IP address to every new client.', null],
  ['networking', 'B2', 'We could not resolve the hostname because the DNS server was offline.', null],
  ['networking', 'B2', 'The connection is very slow during the afternoon.', null],
  ['networking', 'C1', 'The packet loss between the two sites increased after the maintenance window.', null],

  ['servers', 'B1', 'The server has been running since Monday without any problems.', 'The server is running since Monday without any problems.'],
  ['servers', 'B1', 'We need to restart the service after the configuration change.', 'We need restart the service after the configuration change.'],
  ['servers', 'B2', 'The virtual machine does not have enough memory for this workload.', null],
  ['servers', 'B2', 'The backup job finished successfully at three in the morning.', null],
  ['servers', 'B2', 'Two of our servers are currently in maintenance mode.', null],
  ['servers', 'C1', 'The cluster automatically moves the workload to another node when a host fails.', null],

  ['monitoring', 'B1', 'Prometheus collects metrics from the exporter every minute.', 'Prometheus collect metrics of the exporter every minute.'],
  ['monitoring', 'B1', 'The monitoring server is currently offline.', null],
  ['monitoring', 'B2', 'We received an alert because the disk usage exceeded ninety percent.', null],
  ['monitoring', 'B2', 'The dashboard shows the response time of the last twenty four hours.', null],
  ['monitoring', 'B2', 'Please acknowledge the alert so that nobody works on it twice.', null],
  ['monitoring', 'C1', 'The threshold was too sensitive, which caused a lot of false alarms.', null],

  ['security', 'B1', 'You should change your password every three months.', null],
  ['security', 'B1', 'Never share your credentials with anyone.', null],
  ['security', 'B2', 'The account was locked after five failed login attempts.', 'The account was locked after five failed login attempt.'],
  ['security', 'B2', 'We enabled two factor authentication for all administrators.', null],
  ['security', 'B2', 'The attacker tried to exploit an old vulnerability in the web server.', null],
  ['security', 'C1', 'Every incident has to be reported to the security team immediately.', null],

  ['programming', 'B1', 'The function returns an empty list if no results are found.', null],
  ['programming', 'B1', 'I fixed the bug and pushed the changes to the main branch.', null],
  ['programming', 'B2', 'The test fails because the database connection is not mocked.', null],
  ['programming', 'B2', 'We should refactor this method before we add new features.', 'We should refactor this method before we will add new features.'],
  ['programming', 'B2', 'The code review took longer than expected.', null],
  ['programming', 'C1', 'The API returns a clear error message instead of an empty response.', null],

  ['support', 'A2', 'How can I help you today?', null],
  ['support', 'B1', 'A customer reports that the monitoring server is offline.', null],
  ['support', 'B1', 'Could you please describe the problem in more detail?', 'Could you please describe the problem in more details?'],
  ['support', 'B1', 'I will look into it and get back to you shortly.', null],
  ['support', 'B2', 'Unfortunately, we cannot reproduce the error on our side.', null],
  ['support', 'B2', 'Thank you for your patience while we investigate the issue.', null],
  ['support', 'B2', 'I have forwarded your request to our second level support.', null],
  ['support', 'C1', 'We apologise for the inconvenience and will keep you informed about the progress.', null],

  ['business', 'B1', 'The project is behind schedule because of missing hardware.', null],
  ['business', 'B1', 'We need to reduce the costs without losing quality.', null],
  ['business', 'B2', 'The deadline for the offer is the end of next week.', 'The deadline for the offer is the end of next weeks.'],
  ['business', 'B2', 'Our department is responsible for the internal infrastructure.', null],
  ['business', 'C1', 'We agreed on a compromise that works for both sides.', null],

  ['email', 'A2', 'Thank you for your email.', null],
  ['email', 'B1', 'Please find the requested documents attached to this email.', null],
  ['email', 'B1', 'I am writing to you regarding our ticket from last week.', null],
  ['email', 'B2', 'Could you please confirm that you have received the invoice?', null],
  ['email', 'B2', 'I look forward to hearing from you soon.', 'I look forward to hear from you soon.'],
  ['email', 'B2', 'Let me know if you need any further information.', null],

  ['meetings', 'B1', 'The meeting starts at nine and takes about one hour.', null],
  ['meetings', 'B1', 'Could you repeat that, please? I did not understand it.', null],
  ['meetings', 'B2', 'I would like to add one point to the agenda.', null],
  ['meetings', 'B2', 'We postponed the decision until the next meeting.', null],
  ['meetings', 'C1', 'Let us summarise the results before we finish the meeting.', null],

  ['travel', 'A1', 'I would like a room for two nights, please.', null],
  ['travel', 'A2', 'The train to Berlin leaves from platform three.', null],
  ['travel', 'A2', 'Could you tell me where the nearest bus stop is?', 'Could you tell me where is the nearest bus stop?'],
  ['travel', 'B1', 'My flight was delayed by more than two hours.', null],
  ['travel', 'B1', 'Is breakfast included in the price of the room?', null],
  ['travel', 'B2', 'I booked the hotel because it is close to the conference centre.', null],

  ['technology', 'A2', 'The battery of my phone is almost empty.', null],
  ['technology', 'B1', 'The new laptop is much faster than the old one.', 'The new laptop is much more fast than the old one.'],
  ['technology', 'B1', 'Most people use their smartphone to read the news.', null],
  ['technology', 'B2', 'Artificial intelligence changes the way we work with data.', null],
  ['technology', 'B2', 'The device connects to the network without a cable.', null],
  ['technology', 'C1', 'Technology develops faster than most companies can adapt.', null],

  ['general', 'A1', 'My name is Samuel and I work in IT.', null],
  ['general', 'A2', 'There are a lot of people in the office today.', 'There is a lot of people in the office today.'],
  ['general', 'B1', 'Although it was difficult, we solved the problem together.', null],
  ['general', 'B1', 'I am not sure whether this is the right solution.', null],
  ['general', 'B2', 'The more I practise, the easier it becomes.', null],
  ['general', 'B2', 'He said that he had already sent the report.', null],
  ['general', 'C1', 'It is worth spending more time on the preparation.', null],
  ['general', 'C1', 'Had we known about the risk, we would have acted differently.', null]
];

export function seed() {
  const insertCategory = db.prepare('INSERT OR IGNORE INTO categories (slug, name) VALUES (?, ?)');
  const insertExercise = db.prepare('INSERT OR IGNORE INTO exercises (category_id, level, text, corrupted) VALUES ((SELECT id FROM categories WHERE slug = ?), ?, ?, ?)');

  db.transaction(() => {
    for (const [slug, name] of CATEGORIES) insertCategory.run(slug, name);
    for (const [slug, level, text, corrupted] of EXERCISES) insertExercise.run(slug, level, text, corrupted);
  })();

  return db.prepare('SELECT COUNT(*) AS count FROM exercises').get().count;
}
