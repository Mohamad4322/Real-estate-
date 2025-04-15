## The base composer is completed and fully working. Some notes:

You can run the composer from your terminal, in the /Capstone-Group-01 directory. Ensure github is pulled and up-to-date.
Ensure all services are properly installed on your VM, it will not start the service otherwise.

Starting the service once (with/without error) will begin a process on the assigned ports.
If you are testing/debugging, ensure to kill the processes.

DB is on port 8000:
sudo lsof -i :8000

Find process ID, and 
sudo kill -9 <PID>

Same for the frontend,
sudo lsof -i :7012
sudo kill -9 <PID>

The frontend erases the terminal and outputs its own message, not allowing you to see the other processes starting. To stop this, I use nohup, which produces a nohup.out file in the demo (frontend) directory. Ignore/delete this.

This will be fixed in future updates.
