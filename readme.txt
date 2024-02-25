Project Name: Smart Job Advisor

Description: This project is an embeddable web interface intended for HP Inc.'s clients, who are print service providers.
The SJA will automatically determine configuration settings for different print jobs given a PDF, paper types and quality requirements.
The customer can then receive suggested press settings with explanations about why those settings were selected.

Team Members: Jonathan Macias, Jane Kuffler, Karen Setiawan, Ian Collier, Rose Rodarte

Project Partners: Pieter van Zee, Ronald Tippets

List of necessary software/hardware for the project:
- Docker (or Docker Desktop)
- NodeJS
- npm
- gcc compiler (if not using docker)
- jq (if not using docker)
- OpenCV library (if not using docker)
- CentOS7/Debian instance (if not using docker)


How to run components without Docker:
	To launch the web application, from the main repository diretory:
		cd fe
		npm i 
		npm run dev

	To compile pdf analysis agorithm, from the main repository directory:
		cd pdf 
		g++ pdf_algorithm.cpp -o pdf_analyze $(pkg-config --cflags --libs opencv4)
		./pdf_analyze FILE_PATH_HERE
		
	Note: The Backend Server must be ran using Docker
	
	
Running with Docker (steps must be done in order):
	1. To launch the PDF analysis engine, from the main repository directory:
		cd pdf
		docker build . -t sja-pdf
		docker run -v path/to/repo/pdf/pdfs:/app/pdfs sja-pdf:latest FILE_PATH_HERE
	
	2. To launch the backend webserver, from the main repository directory:
		cd be
		docker build . -t sja-be
		docker run -p 8000:80 sja-be:latest dev
		
	3. To run the file upload server, from the file upload server repository directory:
		npm i 
		npm run dev
		
	4. To launch the web application, from the main repository diretory:
		cd fe
		docker build . -t sja-fe
		docker run sja-fe -p 3000:3000
		
	5. To test the API endpoints, from the main repository diretory:
		docker-compose build sja_be_api_tests
		docker-compose build sja_be
		docker-compose up sja_be_api_tests sja_be --abort-on-container-exit --exit-code-from sja_be_api_tests

Link to Git Repo: https://github.com/OSU-Capstone-Group/PPSI

To access this repo run:
    git clone https://github.com/OSU-Capstone-Group/PPSI.git
	
Link to File Upload Git Repo: https://github.com/OSU-Capstone-Group/file-upload-server-example


Unrealized features:
- Job Results variables are translated
- Unit tests are automated and containerized
- Implement a cross origin header for the domain
- Processing speed testing of PDF analysis engine
- Documented warnings for invalid input values


License: MIT