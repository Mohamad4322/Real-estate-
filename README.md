# InvestorIQ - Capstone-Group-01
<img src="./messaging/banner/banner.png" alt="Banner" width="45%" style="max-width:800px; display:block; margin:auto;" />



![Build Status](https://img.shields.io/badge/build-in%20progress-yellow)  

## Tech Stack
<a href="https://react.dev/" target="_blank">
  <img src="https://img.shields.io/badge/React.js-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
</a>
<a href="https://nodejs.org/" target="_blank">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
</a>
<a href="https://mariadb.org/" target="_blank">
  <img src="https://img.shields.io/badge/MariaDB-003545?style=for-the-badge&logo=mariadb&logoColor=white" />
</a>
<a href="https://www.rabbitmq.com/" target="_blank">
  <img src="https://img.shields.io/badge/RabbitMQ-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white" />
</a>
<br>
<a href="https://tailscale.com/" target="_blank">
  <img src="https://img.shields.io/badge/Tailscale-00A9E0?style=for-the-badge&logo=tailscale&logoColor=white" />
</a>
<a href="https://www.ansible.com/" target="_blank">
  <img src="https://img.shields.io/badge/Ansible-002D4D?style=for-the-badge&logo=ansible&logoColor=white" />
</a>
<a href="https://www.nginx.com/" target="_blank">
  <img src="https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white" />
</a>
<br>
<a href="https://www.php.net/" target="_blank">
  <img src="https://img.shields.io/badge/PHP-777BB4?style=for-the-badge&logo=php&logoColor=white" />
</a>
<a href="https://www.python.org/" target="_blank">
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" />
</a>
<a href="https://www.gnu.org/software/bash/" target="_blank">
  <img src="https://img.shields.io/badge/Shell_Scripts-4EAA25?style=for-the-badge&logo=gnu-bash&logoColor=white" />
</a>


<br>
<br>

InvestorIQ is a full-stack real estate investment analysis platform designed to help users discover profitable rental properties in any area. By combining data from the RentCast API and Google Maps, the platform delivers ROI-focused insights to support investment decisions.

## Features

- **Property Search & Visualization**  
  Explore potential investment properties with integrated Google Maps API.

- **Real-Time Rent Data**  
  Access rental comparable properties, vacancy rates, and more using RentCast's API.

- **ROI & Cash Flow Calculations**  
  Estimate return on investment, cash flow, and cap rates at listed purchase price.

- **Investor-Focused Insights**  
  Interface designed for all types of real-estate investors.

- **Deployed on locally hosted Ubuntu VMs**  
  Architecture running on Ubuntu 24.04 servers.

## Architecture

The project includes 4 key components:

1. **Frontend** – User interface with property input & data visualization  
2. **Backend** – API endpoints, data validation, business logic  
3. **Database** – Stores user inputs, search history, and property metrics  
4. **RabbitMQ** – Handles asynchronous communication between services  


