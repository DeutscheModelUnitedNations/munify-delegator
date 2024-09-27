console.info('Starting up...');
console.info('===========================================================');
console.info(`
  __  __ _   _ _   _ _  __         ______   ___   _  ____ 
 |  \\/  | | | | \\ | (_)/ _|_   _  / ___\\ \\ / / \\ | |/ ___|
 | |\\/| | | | |  \\| | | |_| | | | \\___ \\\\ V /|  \\| | |    
 | |  | | |_| | |\\  | |  _| |_| |  ___) || | | |\\  | |___ 
 |_|  |_|\\___/|_| \\_|_|_|  \\__, | |____/ |_| |_| \\_|\\____|
                           |___/                          
`);
console.info('===========================================================');
console.info('Loading tasks...');

// Register Tasks here by importing them
import './conferenceStatus';

console.info('Finished loading tasks.');
