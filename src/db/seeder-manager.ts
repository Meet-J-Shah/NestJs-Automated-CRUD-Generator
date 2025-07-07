import * as path from 'path';
import * as fs from 'fs';
import * as process from 'process';
import dataSource from '../data-source';

const run = async () => {
  const direction = process.argv[2]; // 'run' or 'down'
  const seederName = process.argv[3]; // name of the seeder file without extension

  if (!direction || !['run', 'down'].includes(direction)) {
    console.error(' Please specify "run" or "down"');
    process.exit(1);
  }

  if (!seederName) {
    console.error(' Please specify the seeder name (e.g., PizzaSeeder)');
    process.exit(1);
  }

  try {
    await dataSource.initialize();
    console.log(' Connected to database');

    const seederPath = path.resolve(__dirname, `./seeders/${seederName}`);
    console.log(` Loading seeder: ${seederPath}`);

    if (
      !fs.existsSync(seederPath + '.ts') &&
      !fs.existsSync(seederPath + '.js')
    ) {
      console.error(` Seeder file ${seederName} not found.`);
      process.exit(1);
    }

    const seederModule = await import(seederPath);
    const SeederClass = seederModule.default || seederModule[seederName];

    if (!SeederClass || typeof SeederClass.prototype.run !== 'function') {
      console.error(` Invalid seeder class in ${seederName}`);
      process.exit(1);
    }

    const seeder = new SeederClass();

    if (direction === 'run') {
      await seeder.run(null, dataSource);
      console.log(` Successfully ran seeder: ${seederName}`);
    } else if (direction === 'down') {
      if (typeof seeder.down !== 'function') {
        console.error(
          ` Seeder ${seederName} does not implement a 'down' method.`,
        );
        process.exit(1);
      }
      await seeder.down(null, dataSource);
      console.log(` Successfully reverted seeder: ${seederName}`);
    }

    await dataSource.destroy();
  } catch (err) {
    console.error(` Error executing ${direction} for ${seederName}:`, err);
    process.exit(1);
  }
};

run();
