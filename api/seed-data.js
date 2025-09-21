// Full SEED database with all movies from seed lists - ENRICHED WITH WATCH URLS

const SEED_LIST_1 = [
  {
    "tt": "tt1745960",
    "title": "Top Gun: Maverick",
    "poster": "https://m.media-amazon.com/images/M/MV5BMDBkZDNjMWEtOTdmMi00NmExLTg5MmMtNTFlYTJlNWY5YTdmXkEyXkFqcGc@._V1_FMjpg_UY3000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=g4U4BQW9OEk",
    "year": 2022,
    "genres": [
      "Action",
      "Drama"
    ],
    "director": "Joseph Kosinski",
    "actors": [
      "Tom Cruise",
      "Miles Teller",
      "Jennifer Connelly"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt1745960",
    "watchUrl": "https://www.themoviedb.org/movie/361743/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt11799038",
    "title": "Civil War",
    "poster": "https://m.media-amazon.com/images/M/MV5BYTkzMjc0YzgtY2E0Yi00NDBlLWI0MWUtODY1ZjExMDAyOWZiXkEyXkFqcGc@._V1_FMjpg_UY12000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=cA4wVhs3HC0",
    "year": 2024,
    "genres": [
      "Dystopian",
      "Action",
      "Thriller"
    ],
    "director": "Alex Garland",
    "actors": [
      "Kirsten Dunst",
      "Wagner Moura",
      "Cailee Spaeny"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt11799038",
    "watchUrl": "https://www.justwatch.com/us/search?q=Civil%20War"
  },
  {
    "tt": "tt14807308",
    "title": "She Said",
    "poster": "https://m.media-amazon.com/images/M/MV5BNjVmNTk1NzktMjk3OC00NDYwLWIzMzMtY2EzZWU0YjZlMmRkXkEyXkFqcGc@._V1_FMjpg_UY8800_.jpg",
    "trailer": "https://www.youtube.com/watch?v=WyOUd_2n3vI",
    "year": 2022,
    "genres": [
      "Drama",
      "Biography"
    ],
    "director": "Maria Schrader",
    "actors": [
      "Carey Mulligan",
      "Zoe Kazan",
      "Patricia Clarkson"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt14807308",
    "watchUrl": "https://www.justwatch.com/us/search?q=She%20Said"
  },
  {
    "tt": "tt14807309",
    "title": "Warfare",
    "poster": "https://m.media-amazon.com/images/M/MV5BYzEyYjE1NmEtOTFmNy00ZmQxLThlYzctOGRjNmQ0N2VjMmNmXkEyXkFqcGc@._V1_FMjpg_UY2880_.jpg",
    "trailer": "https://www.youtube.com/watch?v=JER0Fkyy3tw",
    "year": 2025,
    "genres": [
      "War",
      "Action"
    ],
    "director": "Ray Mendoza & Alex Garland",
    "actors": [
      "D'Pharaoh Woon-A-Tai",
      "Will Poulter",
      "Cosmo Jarvis"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt14807309",
    "watchUrl": "https://www.justwatch.com/us/search?q=Warfare"
  },
  {
    "tt": "tt9603213",
    "title": "Mission: Impossible - The Final Reckoning",
    "poster": "https://m.media-amazon.com/images/M/MV5BZjdiYWUwZTMtZjExNC00YTdiLWE4YWEtN2QzNzI0Mzg0NDZjXkEyXkFqcGc@._V1_FMjpg_UY3000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=fsQgc9pCyDU",
    "year": 2023,
    "genres": [
      "Action",
      "Spy",
      "Adventure"
    ],
    "director": "Christopher McQuarrie",
    "actors": [
      "Tom Cruise",
      "Hayley Atwell",
      "Ving Rhames"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt9603213",
    "watchUrl": "https://www.justwatch.com/us/search?q=Mission%3A%20Impossible%20-%20The%20Final%20Reckoning"
  },
  {
    "tt": "tt13622958",
    "title": "The Menu",
    "poster": "https://m.media-amazon.com/images/M/MV5BMDIwMDY4ZTYtMzY4Ny00YTYwLWIxMjgtODM3NGIzNzQ5OTkzXkEyXkFqcGc@._V1_FMjpg_UX1123_.jpg",
    "trailer": "https://www.youtube.com/watch?v=Kx55Rkynhtk",
    "year": 2022,
    "genres": [
      "Black Comedy",
      "Horror",
      "Thriller"
    ],
    "director": "Mark Mylod",
    "actors": [
      "Ralph Fiennes",
      "Anya Taylor-Joy",
      "Nicholas Hoult"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt13622958",
    "watchUrl": "https://www.justwatch.com/us/search?q=The%20Menu"
  },
  {
    "tt": "tt10706602",
    "title": "Thirteen Lives",
    "poster": "https://m.media-amazon.com/images/M/MV5BOTYwMmUzYmUtZjU1Mi00NjQ3LWI0NzktNTU3ZDc5NWE5NTg4XkEyXkFqcGc@._V1_FMjpg_UX988_.jpg",
    "trailer": "https://www.youtube.com/watch?v=R068Si4eb3Y",
    "year": 2022,
    "genres": [
      "Drama",
      "Thriller",
      "Survival"
    ],
    "director": "Ron Howard",
    "actors": [
      "Viggo Mortensen",
      "Colin Farrell",
      "Joel Edgerton"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt10706602",
    "watchUrl": "https://www.themoviedb.org/movie/618363/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt13143964",
    "title": "BlackBerry",
    "poster": "https://m.media-amazon.com/images/M/MV5BYmI4OGQ0YmQtYjkxMS00NzBkLTk2YWUtOTYwMGMyM2YzNjliXkEyXkFqcGc@._V1_FMjpg_UY2946_.jpg",
    "trailer": "https://www.youtube.com/watch?v=fOj0lRfKiVE",
    "year": 2023,
    "genres": [
      "Biography",
      "Comedy-Drama"
    ],
    "director": "Matt Johnson",
    "actors": [
      "Jay Baruchel",
      "Glenn Howerton",
      "Matt Johnson"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt13143964",
    "watchUrl": "https://www.themoviedb.org/movie/740985/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt13143965",
    "title": "September 5",
    "poster": "https://m.media-amazon.com/images/M/MV5BYTI3MjU4MTgtZTU0Yy00MDNhLTg3MWQtNzk1NzljOTQ1YjM1XkEyXkFqcGc@._V1_FMjpg_UX770_.jpg",
    "trailer": "https://www.youtube.com/watch?v=y15maQtXiFY",
    "year": 2024,
    "genres": [
      "Drama",
      "Thriller"
    ],
    "director": "Santiago Mitre",
    "actors": [
      "Peter Lanzani",
      "Ricardo Darín",
      "Julieta Zylberberg"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt13143965",
    "watchUrl": "https://www.justwatch.com/us/search?q=September%205"
  },
  {
    "tt": "tt7405458",
    "title": "A Man Called Otto",
    "poster": "https://m.media-amazon.com/images/M/MV5BZDU3ZTI0MTItOTBlMS00ODY2LWI1MzctODZkZTllZDU1ZTg2XkEyXkFqcGc@._V1_FMjpg_UX900_.jpg",
    "trailer": "https://www.youtube.com/watch?v=eoVw2f9_oi4",
    "year": 2022,
    "genres": [
      "Comedy",
      "Drama"
    ],
    "director": "Marc Forster",
    "actors": [
      "Tom Hanks",
      "Mariana Treviño",
      "Rachel Keller"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt7405458",
    "watchUrl": "https://www.themoviedb.org/movie/937278/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt9603212",
    "title": "Mission: Impossible - Dead Reckoning Part One",
    "poster": "https://m.media-amazon.com/images/M/MV5BN2U4OTdmM2QtZTkxYy00ZmQyLTg2N2UtMDdmMGJmNDhlZDU1XkEyXkFqcGc@._V1_FMjpg_UY3000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=avz06PDqDbM",
    "year": 2023,
    "genres": [
      "Action",
      "Spy",
      "Adventure"
    ],
    "director": "Christopher McQuarrie",
    "actors": [
      "Tom Cruise",
      "Hayley Atwell",
      "Ving Rhames"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt9603212",
    "watchUrl": "https://www.themoviedb.org/movie/575264/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt6723592",
    "title": "Tenet",
    "poster": "https://m.media-amazon.com/images/M/MV5BMTU0ZjZlYTUtYzIwMC00ZmQzLWEwZTAtZWFhMWIwYjMxY2I3XkEyXkFqcGc@._V1_FMjpg_UY3000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=L3pk_TBkihU",
    "year": 2020,
    "genres": [
      "Sci-Fi",
      "Action",
      "Thriller"
    ],
    "director": "Christopher Nolan",
    "actors": [
      "John David Washington",
      "Robert Pattinson",
      "Elizabeth Debicki"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt6723592",
    "watchUrl": "https://www.themoviedb.org/movie/577922/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt13833688",
    "title": "The Whale",
    "poster": "https://m.media-amazon.com/images/M/MV5BYmNhOWMyNTYtNTljNC00NTU3LWFiYmQtMDBhOGU5NWFhNGU5XkEyXkFqcGc@._V1_FMjpg_UY2863_.jpg",
    "trailer": "https://www.youtube.com/watch?v=LM3qt-gHkWU",
    "year": 2022,
    "genres": [
      "Drama",
      "Psychological"
    ],
    "director": "Darren Aronofsky",
    "actors": [
      "Brendan Fraser",
      "Sadie Sink",
      "Hong Chau"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt13833688",
    "watchUrl": "https://www.themoviedb.org/movie/785084/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt3272066",
    "title": "Reminiscence",
    "poster": "https://m.media-amazon.com/images/M/MV5BMTQ1ODk3YjktOTJhMi00NGE1LWFjMzgtMDM2NTNhYmZiNTc4XkEyXkFqcGc@._V1_FMjpg_UX400_.jpg",
    "trailer": "https://www.youtube.com/watch?v=lJk-952EkGA",
    "year": 2021,
    "genres": [
      "Sci-Fi",
      "Thriller"
    ],
    "director": "Lisa Joy",
    "actors": [
      "Hugh Jackman",
      "Rebecca Ferguson",
      "Thandiwe Newton"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt3272066",
    "watchUrl": "https://www.themoviedb.org/movie/579047/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt4873118",
    "title": "The Covenant",
    "poster": "https://m.media-amazon.com/images/M/MV5BMDY2NmI1YzAtYmE2OS00NTY4LWJjM2UtNjQzMDliYzc5MzUyXkEyXkFqcGc@._V1_FMjpg_UY4096_.jpg",
    "trailer": "https://www.youtube.com/watch?v=02PPMPArNEQ",
    "year": 2023,
    "genres": [
      "Action",
      "War",
      "Thriller"
    ],
    "director": "Guy Ritchie",
    "actors": [
      "Jake Gyllenhaal",
      "Dar Salim",
      "Antony Starr"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt4873118",
    "watchUrl": "https://www.themoviedb.org/movie/882569/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt10696784",
    "title": "Worth",
    "poster": "https://m.media-amazon.com/images/M/MV5BNTcxNzhlMjktZWY2Ny00NzQ3LThiMmItMTkzYjFmNDU2NTU4XkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=94jcW1srt_Q",
    "year": 2020,
    "genres": [
      "Drama",
      "Biography"
    ],
    "director": "Sara Colangelo",
    "actors": [
      "Michael Keaton",
      "Stanley Tucci",
      "Amy Ryan"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt10696784",
    "watchUrl": "https://www.themoviedb.org/movie/618162/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt10035728",
    "title": "Operation Mincemeat",
    "poster": "https://m.media-amazon.com/images/M/MV5BMzgzMGFiZGQtYjA0OS00NGYxLWIxMDYtOGUxMDc4YjU3ZWQxXkEyXkFqcGc@._V1_FMjpg_UY2320_.jpg",
    "trailer": "https://www.youtube.com/watch?v=zwkSyrN0mvY",
    "year": 2021,
    "genres": [
      "War",
      "Drama",
      "History"
    ],
    "director": "John Madden",
    "actors": [
      "Colin Firth",
      "Matthew Macfadyen",
      "Kelly Macdonald"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt10035728",
    "watchUrl": "https://www.justwatch.com/us/search?q=Operation%20Mincemeat"
  },
  {
    "tt": "tt11813216",
    "title": "The Banshees of Inisherin",
    "poster": "https://m.media-amazon.com/images/M/MV5BOTkzMWI4OTEtMTk0MS00MTUxLWI4NTYtYmRiNWM4Zjc1MGRhXkEyXkFqcGc@._V1_FMjpg_UY5625_.jpg",
    "trailer": "https://www.youtube.com/watch?v=uRu3zLOJN2c",
    "year": 2022,
    "genres": [
      "Dark Comedy",
      "Drama"
    ],
    "director": "Martin McDonagh",
    "actors": [
      "Colin Farrell",
      "Brendan Gleeson",
      "Kerry Condon"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt11813216",
    "watchUrl": "https://www.themoviedb.org/movie/674324/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt2382320",
    "title": "No Time to Die",
    "poster": "https://m.media-amazon.com/images/M/MV5BZGZiOGZhZDQtZmRkNy00ZmUzLTliMGEtZGU0NjExOGMxZDVkXkEyXkFqcGc@._V1_FMjpg_UY4096_.jpg",
    "trailer": "https://www.youtube.com/watch?v=BIhNsAtPbPI",
    "year": 2021,
    "genres": [
      "Action",
      "Spy",
      "Thriller"
    ],
    "director": "Cary Joji Fukunaga",
    "actors": [
      "Daniel Craig",
      "Léa Seydoux",
      "Rami Malek"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt2382320",
    "watchUrl": "https://www.themoviedb.org/movie/370172/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt12004038",
    "title": "Next Goal Wins",
    "poster": "https://m.media-amazon.com/images/M/MV5BYThhZjU4MTYtNDI5Ni00NTE0LTk2NjUtZmZhMGFiNDhiNDM4XkEyXkFqcGc@._V1_FMjpg_UY2000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=pRH5u5lpArQ",
    "year": 2023,
    "genres": [
      "Comedy",
      "Sports",
      "Drama"
    ],
    "director": "Taika Waititi",
    "actors": [
      "Michael Fassbender",
      "Oscar Kightley",
      "Kaimana"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt12004038",
    "watchUrl": "https://www.themoviedb.org/movie/807356/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt12004039",
    "title": "One Life",
    "poster": "https://m.media-amazon.com/images/M/MV5BOTFmYTFhMTUtODI5NS00NTVkLTk1NjItY2ZkZGU2MmViMGY1XkEyXkFqcGc@._V1_FMjpg_UY3000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=1EVPjV7Toho",
    "year": 2023,
    "genres": [
      "Biography",
      "Drama",
      "History"
    ],
    "director": "James Hawes",
    "actors": [
      "Anthony Hopkins",
      "Johnny Flynn",
      "Helena Bonham Carter"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt12004039",
    "watchUrl": "https://www.justwatch.com/us/search?q=One%20Life"
  },
  {
    "tt": "tt12004040",
    "title": "Champions",
    "poster": "https://m.media-amazon.com/images/M/MV5BMWM0OWZiZTctN2IxZi00NTY2LWEwZjctOWRiNzYzMTg3NzM0XkEyXkFqcGc@._V1_FMjpg_UX1080_.jpg",
    "trailer": "https://www.youtube.com/watch?v=pCHiWnj5Oek",
    "year": 2023,
    "genres": [
      "Comedy",
      "Sports",
      "Drama"
    ],
    "director": "Bobby Farrelly",
    "actors": [
      "Woody Harrelson",
      "Kaitlin Olson",
      "Madison Tevlin"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt12004040",
    "watchUrl": "https://www.justwatch.com/us/search?q=Champions"
  },
  {
    "tt": "tt12004041",
    "title": "Conclave",
    "poster": "https://m.media-amazon.com/images/M/MV5BYWVjYjg2MDgtODk2NC00MjVkLTk4YWItZmNkZmIyNDg2MzVkXkEyXkFqcGc@._V1_FMjpg_UX1080_.jpg",
    "trailer": "https://www.youtube.com/watch?v=JX9jasdi3ic",
    "year": 2024,
    "genres": [
      "Thriller",
      "Drama"
    ],
    "director": "Edward Berger",
    "actors": [
      "Ralph Fiennes",
      "Stanley Tucci",
      "John Lithgow"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt12004041",
    "watchUrl": "https://www.justwatch.com/us/search?q=Conclave"
  },
  {
    "tt": "tt12004042",
    "title": "The Order",
    "poster": "https://m.media-amazon.com/images/M/MV5BZWIxOGQyYjYtOGEwOC00YWNjLWJmNTktZjJlM2RmNTdjMmVlXkEyXkFqcGc@._V1_FMjpg_UY3000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=6ethollg-PI",
    "year": 2024,
    "genres": [
      "Crime",
      "Thriller"
    ],
    "director": "Justin Kurzel",
    "actors": [
      "Jude Law",
      "Nicholas Hoult",
      "Tye Sheridan"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt12004042",
    "watchUrl": "https://www.justwatch.com/us/search?q=The%20Order"
  },
  {
    "tt": "tt5884796",
    "title": "Plane",
    "poster": "https://m.media-amazon.com/images/M/MV5BNDAyYjZmNjctOWE2Mi00ZDBiLWE2YjEtMWM1YmM0NmYzOGQwXkEyXkFqcGc@._V1_FMjpg_UY4096_.jpg",
    "trailer": "https://www.youtube.com/watch?v=M25zXBIUVr0",
    "year": 2023,
    "genres": [
      "Action",
      "Thriller"
    ],
    "director": "Jean-François Richet",
    "actors": [
      "Gerard Butler",
      "Mike Colter",
      "Yoson An"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt5884796",
    "watchUrl": "https://www.themoviedb.org/movie/646389/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt21945706",
    "title": "Anora",
    "poster": "https://m.media-amazon.com/images/M/MV5BYThiN2M0NTItODRmNC00NDhlLWFiYTgtMWM2YTEyYzI3ZTY1XkEyXkFqcGc@._V1_FMjpg_UY5160_.jpg",
    "trailer": "https://www.youtube.com/watch?v=p1HxTmV5i7c0",
    "year": 2024,
    "genres": [
      "Drama"
    ],
    "director": "Sean Baker",
    "actors": [
      "Mikey Madison",
      "Mark Eydelshteyn",
      "Yura Borisov"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt21945706",
    "watchUrl": "https://www.justwatch.com/us/search?q=Anora"
  },
  {
    "tt": "tt7888964",
    "title": "The Courier",
    "poster": "https://m.media-amazon.com/images/M/MV5BMDE2MjE1NzUtMmJiOS00Y2RkLTg1ZGQtM2U1YTNhODVjYWQxXkEyXkFqcGc@._V1_FMjpg_UX1192_.jpg",
    "trailer": "https://www.youtube.com/watch?v=_cL4CaoIiEg",
    "year": 2020,
    "genres": [
      "Thriller",
      "History",
      "Drama"
    ],
    "director": "Dominic Cooke",
    "actors": [
      "Benedict Cumberbatch",
      "Merab Ninidze",
      "Rachel Brosnahan"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt7888964",
    "watchUrl": "https://www.themoviedb.org/movie/615457/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt8760684",
    "title": "Last Breath",
    "poster": "https://m.media-amazon.com/images/M/MV5BYmNjMDg1Y2EtNmZiOS00NGUzLThjZGYtNzU2OGI5M2VkMDFhXkEyXkFqcGc@._V1_FMjpg_UX1080_.jpg",
    "trailer": "https://www.youtube.com/watch?v=_3pgrG4BWtw",
    "year": 2019,
    "genres": [
      "Documentary",
      "Adventure",
      "Thriller"
    ],
    "director": "Alex Parkinson & Richard da Costa",
    "actors": [
      "Chris Lemons",
      "Duncan Allcock",
      "Camila Arantes"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt8760684",
    "watchUrl": "https://www.themoviedb.org/movie/549559/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt4273800",
    "title": "The Good Nurse",
    "poster": "https://m.media-amazon.com/images/M/MV5BMTAzYzQ2MmMtZWQ0ZS00YmRiLWEzNjQtZmQ3NDIyZmI1ZmIwXkEyXkFqcGc@._V1_FMjpg_UY2222_.jpg",
    "trailer": "https://www.youtube.com/watch?v=e0DQevX-GZs",
    "year": 2022,
    "genres": [
      "Biography",
      "Crime",
      "Drama"
    ],
    "director": "Tobias Lindholm",
    "actors": [
      "Jessica Chastain",
      "Eddie Redmayne",
      "Nnamdi Asomugha"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt4273800",
    "watchUrl": "https://www.themoviedb.org/movie/541134/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt4244998",
    "title": "The Last Duel",
    "poster": "https://m.media-amazon.com/images/M/MV5BZGZiNDFkNDgtNDlmNS00NzZmLTg4MmItMzJkYjdmMjJkZDliXkEyXkFqcGc@._V1_FMjpg_UX743_.jpg",
    "trailer": "https://www.youtube.com/watch?v=mgygUwPJvYk",
    "year": 2021,
    "genres": [
      "Action",
      "Drama",
      "History"
    ],
    "director": "Ridley Scott",
    "actors": [
      "Matt Damon",
      "Adam Driver",
      "Jodie Comer"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt4244998",
    "watchUrl": "https://www.themoviedb.org/movie/399360/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt11161474",
    "title": "Pieces of a Woman",
    "poster": "https://m.media-amazon.com/images/M/MV5BYzY0Njg2OWMtYzA2My00NmJjLTk1ZDgtZDZhNTA4M2UzNDkwXkEyXkFqcGc@._V1_FMjpg_UY2222_.jpg",
    "trailer": "https://www.youtube.com/watch?v=1zLKbMAZNGI",
    "year": 2020,
    "genres": [
      "Drama"
    ],
    "director": "Kornél Mundruczó",
    "actors": [
      "Vanessa Kirby",
      "Shia LaBeouf",
      "Ellen Burstyn"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt11161474",
    "watchUrl": "https://www.themoviedb.org/movie/641662/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt21337618",
    "title": "Woman of the Hour",
    "poster": "https://m.media-amazon.com/images/M/MV5BYzliNzRjNDMtYTFmOS00NDQxLWJlOWMtZTViNjcyMzc0NzQwXkEyXkFqcGc@._V1_FMjpg_UX1013_.jpg",
    "trailer": "https://www.youtube.com/watch?v=rFdKPqql_Qo",
    "year": 2023,
    "genres": [
      "Biography",
      "Crime",
      "Drama"
    ],
    "director": "Anna Kendrick",
    "actors": [
      "Anna Kendrick",
      "Daniel Zovatto",
      "Tony Halen"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt21337618",
    "watchUrl": "https://www.justwatch.com/us/search?q=Woman%20of%20the%20Hour"
  },
  {
    "tt": "tt2560078",
    "title": "Boston Strangler",
    "poster": "https://m.media-amazon.com/images/M/MV5BY2ZlNThhOGYtNTUwNC00MWVhLTg2NzQtMWRmOWE2YjFkODZiXkEyXkFqcGc@._V1_FMjpg_UY3000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=N_yfmHCkSB0",
    "year": 2023,
    "genres": [
      "Crime",
      "Drama",
      "Thriller"
    ],
    "director": "Matt Ruskin",
    "actors": [
      "Keira Knightley",
      "Carrie Coon",
      "Chris Cooper"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt2560078",
    "watchUrl": "https://www.themoviedb.org/movie/881164/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt15398776",
    "title": "Oppenheimer",
    "poster": "https://m.media-amazon.com/images/M/MV5BN2JkMDc5MGQtZjg3YS00NmFiLWIyZmQtZTJmNTM5MjVmYTQ4XkEyXkFqcGc@._V1_FMjpg_UY3454_.jpg",
    "trailer": "https://www.youtube.com/watch?v=uYPbbksJxIg",
    "year": 2023,
    "genres": [
      "Biography",
      "Drama",
      "History"
    ],
    "director": "Christopher Nolan",
    "actors": [
      "Cillian Murphy",
      "Emily Blunt",
      "Robert Downey Jr."
    ],
    "imdbUrl": "https://www.imdb.com/title/tt15398776",
    "watchUrl": "https://www.themoviedb.org/movie/872585/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt7737786",
    "title": "Greenland",
    "poster": "https://m.media-amazon.com/images/M/MV5BZWZjZGMwNmUtYmRiMS00ODEwLTgyYjQtOGUzMDNhOGU3OGQ0XkEyXkFqcGc@._V1_FMjpg_UY4095_.jpg",
    "trailer": "https://www.youtube.com/watch?v=vz-gdEL_ae8",
    "year": 2020,
    "genres": [
      "Action",
      "Drama",
      "Thriller"
    ],
    "director": "Ric Roman Waugh",
    "actors": [
      "Gerard Butler",
      "Morena Baccarin",
      "Roger Dale Floyd"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt7737786",
    "watchUrl": "https://www.themoviedb.org/movie/524047/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt1877830",
    "title": "The Batman",
    "poster": "https://m.media-amazon.com/images/M/MV5BNTdjNjJlMmEtYjk5Yy00MjM1LThlOTktMDAwNzlkMjE1ZTk2XkEyXkFqcGc@._V1_FMjpg_UY2477_.jpg",
    "trailer": "https://www.youtube.com/watch?v=mqqft2x_Aa4",
    "year": 2022,
    "genres": [
      "Action",
      "Crime",
      "Drama",
      "Superhero"
    ],
    "director": "Matt Reeves",
    "actors": [
      "Robert Pattinson",
      "Zoë Kravitz",
      "Paul Dano"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt1877830",
    "watchUrl": "https://www.themoviedb.org/movie/414906/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt10954652",
    "title": "Old",
    "poster": "https://m.media-amazon.com/images/M/MV5BM2JkZjI5MjktNmQwZC00ZmYxLTg0OTYtYmVhNGFkMGZlMGYyXkEyXkFqcGc@._V1_FMjpg_UX1154_.jpg",
    "trailer": "https://www.youtube.com/watch?v=A4U2pMRV9_k",
    "year": 2021,
    "genres": [
      "Mystery",
      "Thriller",
      "Horror"
    ],
    "director": "M. Night Shyamalan",
    "actors": [
      "Gael García Bernal",
      "Vicky Krieps",
      "Rufus Sewell"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt10954652",
    "watchUrl": "https://www.themoviedb.org/movie/631843/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt4998632",
    "title": "Ambulance",
    "poster": "https://m.media-amazon.com/images/M/MV5BZDZiY2RmNjgtYzYyZi00ZGEyLTlkOTUtZDc5OTUzY2NlMmEyXkEyXkFqcGc@._V1_FMjpg_UY5000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=7NU-STboFeI",
    "year": 2022,
    "genres": [
      "Action",
      "Crime",
      "Thriller"
    ],
    "director": "Michael Bay",
    "actors": [
      "Jake Gyllenhaal",
      "Yahya Abdul-Mateen II",
      "Eiza González"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt4998632",
    "watchUrl": "https://www.themoviedb.org/movie/763285/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt12528166",
    "title": "Big George Foreman",
    "poster": "https://m.media-amazon.com/images/M/MV5BZWM3N2JiYzMtOTY0NS00OWY2LWJmMjktZTU1YWEyYWY2OTg3XkEyXkFqcGc@._V1_FMjpg_UX972_.jpg",
    "trailer": "https://www.youtube.com/watch?v=urKDu40iaXk",
    "year": 2023,
    "genres": [
      "Biography",
      "Drama",
      "Sport"
    ],
    "director": "George Tillman Jr.",
    "actors": [
      "Khris Davis",
      "Jasmine Mathews",
      "Forest Whitaker"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt12528166",
    "watchUrl": "https://www.themoviedb.org/movie/774714/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt14444726",
    "title": "Tár",
    "poster": "https://m.media-amazon.com/images/M/MV5BYWY5YThhOGUtNDU4OS00NTk3LWI0ODQtNmRiYTk0ZjVkZWU2XkEyXkFqcGc@._V1_FMjpg_UX1080_.jpg",
    "trailer": "https://www.youtube.com/watch?v=Na6gA1RehsU",
    "year": 2022,
    "genres": [
      "Drama",
      "Music"
    ],
    "director": "Todd Field",
    "actors": [
      "Cate Blanchett",
      "Noémie Merlant",
      "Nina Hoss"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt14444726",
    "watchUrl": "https://www.themoviedb.org/movie/817758/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt16426418",
    "title": "Challengers",
    "poster": "https://m.media-amazon.com/images/M/MV5BZTcyZGIyODctZGJhOS00MWUyLWI5ZWEtMjg4YzhkMDczMDBhXkEyXkFqcGc@._V1_FMjpg_UY4096_.jpg",
    "trailer": "https://www.youtube.com/watch?v=VobTTbg-te0",
    "year": 2024,
    "genres": [
      "Drama",
      "Romance",
      "Sport"
    ],
    "director": "Luca Guadagnino",
    "actors": [
      "Zendaya",
      "Mike Faist",
      "Josh O’Connor"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt16426418",
    "watchUrl": "https://www.themoviedb.org/movie/937287/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt24068064",
    "title": "Reality",
    "poster": "https://m.media-amazon.com/images/M/MV5BOWY5NjgzODAtMjZkZS00ZmRkLWIxNzQtMzI0MzhiMGZiMTY4XkEyXkFqcGc@._V1_FMjpg_UX510_.jpg",
    "trailer": "https://www.youtube.com/watch?v=plIUJ-LF7JU",
    "year": 2023,
    "genres": [
      "Drama",
      "Thriller",
      "Biography"
    ],
    "director": "Tina Satter",
    "actors": [
      "Sydney Sweeney",
      "Josh Hamilton",
      "Marchánt Davis"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt24068064",
    "watchUrl": "https://www.themoviedb.org/movie/985617/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt23867462",
    "title": "Scoop",
    "poster": "https://m.media-amazon.com/images/M/MV5BMDY1ZmQ1YTAtMzk1OC00ZGFmLWEwMDYtYjQxNjQ4NGRkMWQ4XkEyXkFqcGc@._V1_FMjpg_UX1080_.jpg",
    "trailer": "https://www.youtube.com/watch?v=cZcHc3zEEoc",
    "year": 2023,
    "genres": [
      "Biography",
      "Drama"
    ],
    "director": "Philip Martin",
    "actors": [
      "Gillian Anderson",
      "Billie Piper",
      "Rufus Sewell"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt23867462",
    "watchUrl": "https://www.themoviedb.org/movie/1057648/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt12732114",
    "title": "Confess, Fletch",
    "poster": "https://m.media-amazon.com/images/M/MV5BMTUzNDU5YTgtZjNjNS00MjZjLTllZjYtY2RjMDNlZDc4NmM2XkEyXkFqcGc@._V1_FMjpg_UY3000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=pb2Pu5EjC1s",
    "year": 2022,
    "genres": [
      "Comedy",
      "Crime",
      "Mystery"
    ],
    "director": "Greg Mottola",
    "actors": [
      "Jon Hamm",
      "Roy Wood Jr.",
      "Annie Mumolo"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt12732114",
    "watchUrl": "https://www.justwatch.com/us/search?q=Confess%2C%20Fletch"
  },
  {
    "tt": "tt1136617",
    "title": "The Killer",
    "poster": "https://m.media-amazon.com/images/M/MV5BYzU2MTlkMTctNWI3MC00ODUzLTlmYzQtMzZjYjVmMmYwZGU0XkEyXkFqcGc@._V1_FMjpg_UX1013_.jpg",
    "trailer": "https://www.youtube.com/watch?v=5S7FR_HCg9g",
    "year": 2023,
    "genres": [
      "Crime",
      "Thriller"
    ],
    "director": "David Fincher",
    "actors": [
      "Michael Fassbender",
      "Tilda Swinton",
      "Charles Parnell"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt1136617",
    "watchUrl": "https://www.themoviedb.org/movie/800158/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt12536294",
    "title": "Spencer",
    "poster": "https://m.media-amazon.com/images/M/MV5BNjcyYzIyMTItNDQzYS00ZmI5LWJlYzItZDk5ZmEyNDlhNWQ3XkEyXkFqcGc@._V1_FMjpg_UY5400_.jpg",
    "trailer": "https://www.youtube.com/watch?v=WllZh9aekDg",
    "year": 2021,
    "genres": [
      "Biography",
      "Drama",
      "History"
    ],
    "director": "Pablo Larraín",
    "actors": [
      "Kristen Stewart",
      "Sally Hawkins",
      "Timothy Spall"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt12536294",
    "watchUrl": "https://www.themoviedb.org/movie/716612/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt13287846",
    "title": "Napoleon",
    "poster": "https://m.media-amazon.com/images/M/MV5BZGQ1NGUxNDUtNjg3Yi00ZTZjLWIwOTUtNDBjYWY5ZjVmZGI4XkEyXkFqcGc@._V1_FMjpg_UY9000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=LIsfMO5Jd_w",
    "year": 2023,
    "genres": [
      "Biography",
      "Drama",
      "History",
      "War"
    ],
    "director": "Ridley Scott",
    "actors": [
      "Joaquin Phoenix",
      "Vanessa Kirby",
      "Tahar Rahim"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt13287846",
    "watchUrl": "https://www.themoviedb.org/movie/753342/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt31013034",
    "title": "Caught Stealing",
    "poster": "https://m.media-amazon.com/images/M/MV5BYTk0YTIyYmMtMTJjOC00NmNiLTkxMTktYTU0ZDFhNjJlMTJiXkEyXkFqcGc@._V1_FMjpg_UX1080_.jpg",
    "trailer": "https://www.youtube.com/watch?v=6mIvD-GN-p4",
    "year": 2024,
    "genres": [
      "Crime",
      "Thriller"
    ],
    "director": "Darren Aronofsky",
    "actors": [
      "Austin Butler",
      "André Holland",
      "Yul Vazquez"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt31013034",
    "watchUrl": "https://www.justwatch.com/us/search?q=Caught%20Stealing"
  },
  {
    "tt": "tt90000049",
    "title": "Gladiator II",
    "poster": "https://m.media-amazon.com/images/M/MV5BMWYzZTM5ZGQtOGE5My00NmM2LWFlMDEtMGNjYjdmOWM1MzA1XkEyXkFqcGc@._V1_FMjpg_UX878_.jpg",
    "trailer": "https://www.youtube.com/watch?v=4rgYUipGJNo",
    "year": 2024,
    "genres": [
      "Epic",
      "Historical Drama",
      "Action"
    ],
    "director": "Ridley Scott",
    "actors": [
      "Paul Mescal",
      "Pedro Pascal",
      "Denzel Washington"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000049",
    "watchUrl": "https://www.justwatch.com/us/search?q=Gladiator%20II"
  },
  {
    "tt": "tt90000050",
    "title": "Kandahar",
    "poster": "https://m.media-amazon.com/images/M/MV5BOTQ5NTlkZTctODdmMi00Nzc1LWI0NTMtYmY0MDhjZTBkYjI2XkEyXkFqcGc@._V1_FMjpg_UX810_.jpg",
    "trailer": "https://www.youtube.com/watch?v=WHs6z9RPGtA",
    "year": 2023,
    "genres": [
      "Spy",
      "Action",
      "Thriller"
    ],
    "director": "Ric Roman Waugh",
    "actors": [
      "Gerard Butler",
      "Ali Fazal",
      "Navid Negahban"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000050",
    "watchUrl": "https://www.justwatch.com/us/search?q=Kandahar"
  },
  {
    "tt": "tt90000051",
    "title": "No Hard Feelings",
    "poster": "https://m.media-amazon.com/images/M/MV5BZjk1NmZiNzYtZGUyYi00YzEwLTgwNWQtM2VmOWFmMGIwZDM2XkEyXkFqcGc@._V1_FMjpg_UY5000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=P15S6ND8kbQ",
    "year": 2023,
    "genres": [
      "Sex Comedy",
      "Romantic Comedy"
    ],
    "director": "Gene Stupnitsky",
    "actors": [
      "Jennifer Lawrence",
      "Andrew Barth Feldman",
      "Laura Benanti"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000051",
    "watchUrl": "https://www.justwatch.com/us/search?q=No%20Hard%20Feelings"
  },
  {
    "tt": "tt90000052",
    "title": "The Unlikely Pilgrimage of Harold Fry",
    "poster": "https://m.media-amazon.com/images/M/MV5BZWZjNjc5ZDMtMmYyNC00ZTY1LWE2ZjItMTVjMjRkYmYzYThlXkEyXkFqcGc@._V1_FMjpg_UY1891_.jpg",
    "trailer": "https://www.youtube.com/watch?v=xeSrRrA4dXw",
    "year": 2023,
    "genres": [
      "Drama"
    ],
    "director": "Hettie Macdonald",
    "actors": [
      "Jim Broadbent",
      "Penelope Wilton",
      "Earl Cave"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000052",
    "watchUrl": "https://www.justwatch.com/us/search?q=The%20Unlikely%20Pilgrimage%20of%20Harold%20Fry"
  },
  {
    "tt": "tt90000053",
    "title": "Barbie",
    "poster": "https://m.media-amazon.com/images/M/MV5BYjI3NDU0ZGYtYjA2YS00Y2RlLTgwZDAtYTE2YTM5ZjE1M2JlXkEyXkFqcGc@._V1_FMjpg_UY2814_.jpg",
    "trailer": "https://www.youtube.com/watch?v=pBk4NYhWNMM",
    "year": 2023,
    "genres": [
      "Fantasy",
      "Comedy"
    ],
    "director": "Greta Gerwig",
    "actors": [
      "Margot Robbie",
      "Ryan Gosling",
      "America Ferrera"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000053",
    "watchUrl": "https://www.justwatch.com/us/search?q=Barbie"
  },
  {
    "tt": "tt90000054",
    "title": "Whitney Houston: I Wanna Dance with Somebody",
    "poster": "https://m.media-amazon.com/images/M/MV5BNzM0Y2QwOTUtMDg3NS00MDU4LTllNmItYzEwNmVmZGZkMTljXkEyXkFqcGc@._V1_FMjpg_UY9000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=9tfemzaMkoU",
    "year": 2022,
    "genres": [
      "Biographical",
      "Musical",
      "Drama"
    ],
    "director": "Kasi Lemmons",
    "actors": [
      "Naomi Ackie",
      "Stanley Tucci",
      "Ashton Sanders"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000054",
    "watchUrl": "https://www.justwatch.com/us/search?q=Whitney%20Houston%3A%20I%20Wanna%20Dance%20with%20Somebody"
  },
  {
    "tt": "tt90000055",
    "title": "The Lost King",
    "poster": "https://m.media-amazon.com/images/M/MV5BNzRmNDg2NTAtYjI4Yi00NGY2LTg5MmYtYzI1NTBkYjY1YWEyXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=TXxRfhQFuV4",
    "year": 2022,
    "genres": [
      "Biographical",
      "Drama",
      "Comedy-Drama"
    ],
    "director": "Stephen Frears",
    "actors": [
      "Sally Hawkins",
      "Steve Coogan",
      "Harry Lloyd"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000055",
    "watchUrl": "https://www.justwatch.com/us/search?q=The%20Lost%20King"
  },
  {
    "tt": "tt90000056",
    "title": "Glass Onion",
    "poster": "https://m.media-amazon.com/images/M/MV5BMzI2ZDYxZTEtMzVlOC00OTUyLTgyNTAtYWFhNmRhZjAzZWE1XkEyXkFqcGc@._V1_FMjpg_UY2222_.jpg",
    "trailer": "https://www.youtube.com/watch?v=rFdKPqql_Qo",
    "year": 2022,
    "genres": [
      "Mystery",
      "Comedy Thriller"
    ],
    "director": "Rian Johnson",
    "actors": [
      "Daniel Craig",
      "Edward Norton",
      "Janelle Monáe"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000056",
    "watchUrl": "https://www.justwatch.com/us/search?q=Glass%20Onion"
  },
  {
    "tt": "tt90000057",
    "title": "Stillwater",
    "poster": "https://m.media-amazon.com/images/M/MV5BZTI5NjU1ZDgtYTUzOS00YmFjLWIwNDgtOWYyM2I2ZDZmNjExXkEyXkFqcGc@._V1_FMjpg_UX500_.jpg",
    "trailer": "https://www.youtube.com/watch?v=9cq1lPPeMUY",
    "year": 2021,
    "genres": [
      "Crime",
      "Drama",
      "Thriller"
    ],
    "director": "Tom McCarthy",
    "actors": [
      "Matt Damon",
      "Camille Cottin",
      "Abigail Breslin"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000057",
    "watchUrl": "https://www.justwatch.com/us/search?q=Stillwater"
  },
  {
    "tt": "tt90000058",
    "title": "Nobody",
    "poster": "https://m.media-amazon.com/images/M/MV5BNjE1NjRhZWQtYTYzNy00NTUxLTk4MWMtZjRjNGIyY2E1OWFmXkEyXkFqcGc@._V1_FMjpg_UX1013_.jpg",
    "trailer": "https://www.youtube.com/watch?v=wZti8QKBWPo",
    "year": 2021,
    "genres": [
      "Action",
      "Thriller"
    ],
    "director": "Ilya Naishuller",
    "actors": [
      "Bob Odenkirk",
      "Aleksey Serebryakov",
      "Connie Nielsen"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000058",
    "watchUrl": "https://www.justwatch.com/us/search?q=Nobody"
  },
  {
    "tt": "tt90000059",
    "title": "Don't Look Up",
    "poster": "https://m.media-amazon.com/images/M/MV5BOTI0ZDdhZjAtYTIzNi00ZmQwLThkMWEtNjVjNGRiMWM1OGVlXkEyXkFqcGc@._V1_FMjpg_UY2222_.jpg",
    "trailer": "https://www.youtube.com/watch?v=RbIxYm3mKzI",
    "year": 2021,
    "genres": [
      "Science Fiction",
      "Satire",
      "Comedy Drama"
    ],
    "director": "Adam McKay",
    "actors": [
      "Leonardo DiCaprio",
      "Jennifer Lawrence",
      "Meryl Streep"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000059",
    "watchUrl": "https://www.justwatch.com/us/search?q=Don't%20Look%20Up"
  },
  {
    "tt": "tt90000060",
    "title": "Anyone But You",
    "poster": "https://m.media-amazon.com/images/M/MV5BZWUxYTFhMzItMmE0ZC00ODgzLTkwZWItOGUwMTI1YjQwMDJjXkEyXkFqcGc@._V1_FMjpg_UY3000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=UtjH6Sk7Gxs",
    "year": 2023,
    "genres": [
      "Romantic Comedy"
    ],
    "director": "Will Gluck",
    "actors": [
      "Sydney Sweeney",
      "Glen Powell",
      "Alexandra Shipp"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000060",
    "watchUrl": "https://www.justwatch.com/us/search?q=Anyone%20But%20You"
  },
  {
    "tt": "tt90000061",
    "title": "Fly Me to the Moon",
    "poster": "https://m.media-amazon.com/images/M/MV5BYzI4MzRlMGYtYWUwMC00M2FkLTliN2ItNDA1MDJhOTgwMzY5XkEyXkFqcGc@._V1_FMjpg_UY2100_.jpg",
    "trailer": "https://www.youtube.com/watch?v=lW7enw6mFxs",
    "year": 2024,
    "genres": [
      "Romantic Comedy",
      "Drama"
    ],
    "director": "Greg Berlanti",
    "actors": [
      "Scarlett Johansson",
      "Channing Tatum",
      "Woody Harrelson"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000061",
    "watchUrl": "https://www.justwatch.com/us/search?q=Fly%20Me%20to%20the%20Moon"
  },
  {
    "tt": "tt90000062",
    "title": "Trap",
    "poster": "https://m.media-amazon.com/images/M/MV5BMzJiN2UyZjgtMjQ3MS00MDhhLTg5ZDItZmVjMTU3MTcwNzE4XkEyXkFqcGc@._V1_FMjpg_UY4096_.jpg",
    "trailer": "https://www.youtube.com/watch?v=hJiPAJKjUVg",
    "year": 2024,
    "genres": [
      "Thriller"
    ],
    "director": "M. Night Shyamalan",
    "actors": [
      "Josh Hartnett",
      "Ariel Donoghue",
      "Hayley Mills"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000062",
    "watchUrl": "https://www.justwatch.com/us/search?q=Trap"
  },
  {
    "tt": "tt90000063",
    "title": "The Apprentice",
    "poster": "https://m.media-amazon.com/images/M/MV5BZjI3MWUwOTMtOTY1YS00NzE0LWE1OTYtYmQ0Mjg2NDEyMzMxXkEyXkFqcGc@._V1_FMjpg_UY2835_.jpg",
    "trailer": "https://www.youtube.com/watch?v=bvPRxy9kmSg",
    "year": 2024,
    "genres": [
      "Biographical",
      "Drama"
    ],
    "director": "Ali Abbasi",
    "actors": [
      "Sebastian Stan",
      "Maria Bakalova",
      "Jeremy Strong"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000063",
    "watchUrl": "https://www.justwatch.com/us/search?q=The%20Apprentice"
  },
  {
    "tt": "tt90000064",
    "title": "The Fall Guy",
    "poster": "https://m.media-amazon.com/images/M/MV5BM2U0MTJiYTItMjNiZS00MzU4LTkxYTAtYTU0ZGY1ODJhMjRhXkEyXkFqcGc@._V1_FMjpg_UY2500_.jpg",
    "trailer": "https://www.youtube.com/watch?v=j7jPnwVGdZ8",
    "year": 2024,
    "genres": [
      "Action",
      "Comedy"
    ],
    "director": "David Leitch",
    "actors": [
      "Ryan Gosling",
      "Emily Blunt",
      "Aaron Taylor-Johnson"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000064",
    "watchUrl": "https://www.justwatch.com/us/search?q=The%20Fall%20Guy"
  },
  {
    "tt": "tt90000065",
    "title": "Elvis",
    "poster": "https://m.media-amazon.com/images/M/MV5BNTVhZmUyMDQtY2I5Ny00OWNiLTgzNjUtMTg4YTQwMTc0OTQxXkEyXkFqcGc@._V1_FMjpg_UY4096_.jpg",
    "trailer": "https://www.youtube.com/watch?v=KIsojttVj4o",
    "year": 2022,
    "genres": [
      "Biographical",
      "Musical",
      "Drama"
    ],
    "director": "Baz Luhrmann",
    "actors": [
      "Austin Butler",
      "Tom Hanks",
      "Olivia DeJonge"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000065",
    "watchUrl": "https://www.justwatch.com/us/search?q=Elvis"
  },
  {
    "tt": "tt90000066",
    "title": "Mothers' Instinct",
    "poster": "https://m.media-amazon.com/images/M/MV5BMDcwMDRhZjQtNTU0YS00YmZlLTk4ZWEtNWMyOTE2ZDI0NWUyXkEyXkFqcGc@._V1_FMjpg_UX656_.jpg",
    "trailer": "https://www.youtube.com/watch?v=plIUJ-LF7JU",
    "year": 2023,
    "genres": [
      "Drama",
      "Thriller",
      "Biography"
    ],
    "director": "Tina Satter",
    "actors": [
      "Sydney Sweeney",
      "Josh Hamilton",
      "Marchánt Davis"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000066",
    "watchUrl": "https://www.justwatch.com/us/search?q=Mothers'%20Instinct"
  },
  {
    "tt": "tt90000067",
    "title": "Back to Black",
    "poster": "https://m.media-amazon.com/images/M/MV5BM2JiZjZkMDMtMTI1Ni00Yjc2LTliMTEtOGM2YWNlYWNhZjRmXkEyXkFqcGc@._V1_FMjpg_UX505_.jpg",
    "trailer": "https://www.youtube.com/watch?v=rYzIOBwyhIU",
    "year": 2024,
    "genres": [
      "Biographical",
      "Drama",
      "Musical"
    ],
    "director": "Sam Taylor-Johnson",
    "actors": [
      "Marisa Abela",
      "Jack O’Connell",
      "Eddie Marsan"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000067",
    "watchUrl": "https://www.justwatch.com/us/search?q=Back%20to%20Black"
  },
  {
    "tt": "tt90000068",
    "title": "The Amateur",
    "poster": "https://m.media-amazon.com/images/M/MV5BOWMyZTJmMTUtNDNiYy00ZGE2LWIzZjAtZmQyZWQ0NjdiMjI5XkEyXkFqcGc@._V1_FMjpg_UX1080_.jpg",
    "trailer": "https://www.youtube.com/watch?v=DCWcK4c-F8Q",
    "year": 2025,
    "genres": [
      "Action",
      "Thriller"
    ],
    "director": "James Hawes",
    "actors": [
      "Rami Malek",
      "Rachel Brosnahan",
      "Laurence Fishburne"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000068",
    "watchUrl": "https://www.justwatch.com/us/search?q=The%20Amateur"
  },
  {
    "tt": "tt90000069",
    "title": "The Lost City",
    "poster": "https://m.media-amazon.com/images/M/MV5BYjhkZjM3ZWYtMjUxMS00YzhlLTkxZWYtMzhkMzFhOTQ1NjRkXkEyXkFqcGc@._V1_FMjpg_UY2500_.jpg",
    "trailer": "https://www.youtube.com/watch?v=nfKO9rYDmE8",
    "year": 2022,
    "genres": [
      "Action",
      "Adventure",
      "Comedy"
    ],
    "director": "Aaron Nee & Adam Nee",
    "actors": [
      "Sandra Bullock",
      "Channing Tatum",
      "Daniel Radcliffe"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000069",
    "watchUrl": "https://www.justwatch.com/us/search?q=The%20Lost%20City"
  },
  {
    "tt": "tt90000070",
    "title": "The King's Man",
    "poster": "https://m.media-amazon.com/images/M/MV5BZDNhOWQwYzMtMDlhNi00MzM1LWI3ZjctNjAzYjlhMjQ5YTNiXkEyXkFqcGc@._V1_FMjpg_UY2500_.jpg",
    "trailer": "https://www.youtube.com/watch?v=5zdBG-iGfes",
    "year": 2021,
    "genres": [
      "Action",
      "Spy",
      "War"
    ],
    "director": "Matthew Vaughn",
    "actors": [
      "Ralph Fiennes",
      "Gemma Arterton",
      "Rhys Ifans"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000070",
    "watchUrl": "https://www.justwatch.com/us/search?q=The%20King's%20Man"
  },
  {
    "tt": "tt90000071",
    "title": "Free Guy",
    "poster": "https://m.media-amazon.com/images/M/MV5BN2I0MGMxYjUtZTZiMS00MzMxLTkzNWYtMDUyZmUwY2ViYTljXkEyXkFqcGc@._V1_FMjpg_UY3000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=X2m-08cOAbc",
    "year": 2021,
    "genres": [
      "Action",
      "Comedy",
      "Sci-Fi"
    ],
    "director": "Shawn Levy",
    "actors": [
      "Ryan Reynolds",
      "Jodie Comer",
      "Taika Waititi"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000071",
    "watchUrl": "https://www.justwatch.com/us/search?q=Free%20Guy"
  },
  {
    "tt": "tt90000072",
    "title": "The 355",
    "poster": "https://m.media-amazon.com/images/M/MV5BNzhkNmZlODUtYWM4YS00NzRlLWEwOTgtM2U5ZDA0ZDJjNDI3XkEyXkFqcGc@._V1_FMjpg_UY5000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=SV0s2S9reT0",
    "year": 2022,
    "genres": [
      "Action",
      "Spy Thriller"
    ],
    "director": "Simon Kinberg",
    "actors": [
      "Jessica Chastain",
      "Penélope Cruz",
      "Lupita Nyong’o"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000072",
    "watchUrl": "https://www.justwatch.com/us/search?q=The%20355"
  },
  {
    "tt": "tt90000073",
    "title": "Where the Crawdads Sing",
    "poster": "https://m.media-amazon.com/images/M/MV5BZGM5ODU5YTktMGUxYi00YjQyLTk0MzgtZTg0MWQ2NDg0YTA0XkEyXkFqcGc@._V1_FMjpg_UX600_.jpg",
    "trailer": "https://www.youtube.com/watch?v=PY3808Iq0Tg",
    "year": 2022,
    "genres": [
      "Mystery",
      "Drama",
      "Thriller"
    ],
    "director": "Olivia Newman",
    "actors": [
      "Daisy Edgar-Jones",
      "Taylor John Smith",
      "Harris Dickinson"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000073",
    "watchUrl": "https://www.justwatch.com/us/search?q=Where%20the%20Crawdads%20Sing"
  },
  {
    "tt": "tt90000074",
    "title": "Nightmare Alley",
    "poster": "https://m.media-amazon.com/images/M/MV5BNThlMDUzMDEtOTY1ZC00MzI3LThlOGItYjI0MTdkZDliNDEzXkEyXkFqcGc@._V1_FMjpg_UX1012_.jpg",
    "trailer": "https://www.youtube.com/watch?v=Q81Yf46Oj3s",
    "year": 2021,
    "genres": [
      "Neo-noir",
      "Psychological Thriller"
    ],
    "director": "Guillermo del Toro",
    "actors": [
      "Bradley Cooper",
      "Cate Blanchett",
      "Rooney Mara"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000074",
    "watchUrl": "https://www.justwatch.com/us/search?q=Nightmare%20Alley"
  },
  {
    "tt": "tt90000075",
    "title": "Munich: The Edge of War",
    "poster": "https://m.media-amazon.com/images/M/MV5BNzU4NGVlMTAtODEyNC00YjkzLWIwYmQtMGVhYWFjNTM0MTBiXkEyXkFqcGc@._V1_FMjpg_UY2048_.jpg",
    "trailer": "https://www.youtube.com/watch?v=AQ7x8odi-OU",
    "year": 2021,
    "genres": [
      "Historical Drama",
      "Thriller"
    ],
    "director": "Christian Schwochow",
    "actors": [
      "George MacKay",
      "Jannis Niewöhner",
      "Jeremy Irons"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000075",
    "watchUrl": "https://www.justwatch.com/us/search?q=Munich%3A%20The%20Edge%20of%20War"
  },
  {
    "tt": "tt90000076",
    "title": "Minamata",
    "poster": "https://m.media-amazon.com/images/M/MV5BMDRkZDgyNjQtMTY0OC00MzFiLTlmYjUtNjgxNmJlYTAwZDc0XkEyXkFqcGc@._V1_FMjpg_UY6000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=WP3pKTssw_E",
    "year": 2020,
    "genres": [
      "Biographical",
      "Drama"
    ],
    "director": "Andrew Levitas",
    "actors": [
      "Johnny Depp",
      "Minami",
      "Hiroyuki Sanada"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000076",
    "watchUrl": "https://www.justwatch.com/us/search?q=Minamata"
  },
  {
    "tt": "tt90000077",
    "title": "The Unbearable Weight of Massive Talent",
    "poster": "https://m.media-amazon.com/images/M/MV5BMWEzMTA3MjAtOTkwYS00ZTNlLWIzYzMtMDIxNzU0NTlkMGRlXkEyXkFqcGc@._V1_FMjpg_UY4096_.jpg",
    "trailer": "https://www.youtube.com/watch?v=CKTRbKch2K4",
    "year": 2022,
    "genres": [
      "Action",
      "Comedy"
    ],
    "director": "Tom Gormican",
    "actors": [
      "Nicolas Cage",
      "Pedro Pascal",
      "Tiffany Haddish"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000077",
    "watchUrl": "https://www.justwatch.com/us/search?q=The%20Unbearable%20Weight%20of%20Massive%20Talent"
  },
  {
    "tt": "tt90000078",
    "title": "Last Night in Soho",
    "poster": "https://m.media-amazon.com/images/M/MV5BODdhZjBmZTEtZmQyMy00NWY5LWJiMWQtODhjODFkZWZlMjMyXkEyXkFqcGc@._V1_FMjpg_UX1013_.jpg",
    "trailer": "https://www.youtube.com/watch?v=AcVnFrxjPjI",
    "year": 2021,
    "genres": [
      "Psychological Horror",
      "Thriller"
    ],
    "director": "Edgar Wright",
    "actors": [
      "Thomasin McKenzie",
      "Anya Taylor-Joy",
      "Matt Smith"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000078",
    "watchUrl": "https://www.justwatch.com/us/search?q=Last%20Night%20in%20Soho"
  },
  {
    "tt": "tt90000079",
    "title": "A Haunting in Venice",
    "poster": "https://m.media-amazon.com/images/M/MV5BOTgwODdhZTMtYTFiNy00NzI1LTkwZWEtNjI2NWZiMzFmMjJlXkEyXkFqcGc@._V1_FMjpg_UX1179_.jpg",
    "trailer": "https://www.youtube.com/watch?v=yEddsSwweyE",
    "year": 2023,
    "genres": [
      "Mystery",
      "Thriller"
    ],
    "director": "Kenneth Branagh",
    "actors": [
      "Kenneth Branagh",
      "Michelle Yeoh",
      "Tina Fey"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000079",
    "watchUrl": "https://www.justwatch.com/us/search?q=A%20Haunting%20in%20Venice"
  },
  {
    "tt": "tt90000080",
    "title": "Wicked Little Letters",
    "poster": "https://m.media-amazon.com/images/M/MV5BZGUzOTFjNWYtY2Q2ZC00ZDU0LWIyZWEtMzFlNmI3OTdjN2VkXkEyXkFqcGc@._V1_FMjpg_UY2866_.jpg",
    "trailer": "https://www.youtube.com/watch?v=SeTeCWbF8KY",
    "year": 2023,
    "genres": [
      "Comedy",
      "Drama",
      "Mystery"
    ],
    "director": "Thea Sharrock",
    "actors": [
      "Olivia Colman",
      "Jessie Buckley",
      "Anjana Vasan"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000080",
    "watchUrl": "https://www.justwatch.com/us/search?q=Wicked%20Little%20Letters"
  },
  {
    "tt": "tt90000081",
    "title": "Juror #2",
    "poster": "https://m.media-amazon.com/images/M/MV5BMjM4YjA1NTItOWI3Ni00MzAwLThmMjMtNmM2MWY2Y2ZmOGIzXkEyXkFqcGc@._V1_FMjpg_UY2036_.jpg",
    "trailer": "https://www.youtube.com/watch?v=EhkkBFhW-MM",
    "year": 2024,
    "genres": [
      "Crime",
      "Thriller",
      "Drama"
    ],
    "director": "Clint Eastwood",
    "actors": [
      "Nicholas Hoult",
      "Toni Collette",
      "Zoey Deutch"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000081",
    "watchUrl": "https://www.justwatch.com/us/search?q=Juror%20%232"
  },
  {
    "tt": "tt90000082",
    "title": "F1: The Movie",
    "poster": "https://m.media-amazon.com/images/M/MV5BMWNhMjkwMDYtNjZlNC00NGZhLWFiNGYtYzhjM2M2NjZjMDY0XkEyXkFqcGc@._V1_FMjpg_UY2835_.jpg",
    "trailer": "https://www.youtube.com/watch?v=eoVw2f9_oi4",
    "year": 2024,
    "genres": [
      "Sports",
      "Documentary",
      "Drama"
    ],
    "director": "Joseph Kosinski",
    "actors": [
      "Brad Pitt",
      "Lewis Hamilton",
      "Patrick Dempsey"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000082",
    "watchUrl": "https://www.justwatch.com/us/search?q=F1%3A%20The%20Movie"
  },
  {
    "tt": "tt90000083",
    "title": "A Complete Unknown",
    "poster": "https://m.media-amazon.com/images/M/MV5BYTA2NTA5NDYtMzlkOC00MTQxLWI0NDQtMzk2M2YzMGE4MTkxXkEyXkFqcGc@._V1_FMjpg_UY2000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=FdV-Cs5o8mc",
    "year": 2025,
    "genres": [
      "Biography",
      "Drama",
      "Music"
    ],
    "director": "James Mangold",
    "actors": [
      "Timothée Chalamet",
      "Monica Barbaro",
      "Edward Norton"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000083",
    "watchUrl": "https://www.justwatch.com/us/search?q=A%20Complete%20Unknown"
  },
  {
    "tt": "tt90000084",
    "title": "Bridget Jones: Mad About the Boy",
    "poster": "https://m.media-amazon.com/images/M/MV5BMDdlY2Y2ZWEtYjk4Mi00Yjg3LWFlM2MtMWI1ZjVlNGQ5NTNjXkEyXkFqcGc@._V1_FMjpg_UY5000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=AZr9lYz12jw",
    "year": 2025,
    "genres": [
      "Romantic Comedy",
      "Drama"
    ],
    "director": "Michael Morris",
    "actors": [
      "Renée Zellweger",
      "Chiwetel Ejiofor",
      "Leo Woodall"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000084",
    "watchUrl": "https://www.justwatch.com/us/search?q=Bridget%20Jones%3A%20Mad%20About%20the%20Boy"
  },
  {
    "tt": "tt90000085",
    "title": "Companion",
    "poster": "https://m.media-amazon.com/images/M/MV5BYjkyZTA5NzAtYWU3Zi00MWM4LTgxNzAtNDQxY2JmNjMwYjk4XkEyXkFqcGc@._V1_FMjpg_UY4096_.jpg",
    "trailer": "https://www.youtube.com/watch?v=Qr_kX0D3DNA",
    "year": 2025,
    "genres": [
      "Sci-Fi",
      "Thriller",
      "Horror"
    ],
    "director": "Drew Hancock",
    "actors": [
      "Jack Quaid",
      "Lukas Gage",
      "Megan Suri"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000085",
    "watchUrl": "https://www.justwatch.com/us/search?q=Companion"
  },
  {
    "tt": "tt90000086",
    "title": "Black Bag",
    "poster": "https://m.media-amazon.com/images/M/MV5BNzA1OWU4NDMtMDUxMC00NWI4LWJhYjUtYWQ0OGQ5MTc2NDRjXkEyXkFqcGc@._V1_FMjpg_UY12000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=Du0Xp8WX_7I",
    "year": 2025,
    "genres": [
      "Spy Thriller"
    ],
    "director": "Steven Soderbergh",
    "actors": [
      "Cate Blanchett",
      "Michael Fassbender",
      "Regé-Jean Page"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000086",
    "watchUrl": "https://www.justwatch.com/us/search?q=Black%20Bag"
  },
  {
    "tt": "tt90000087",
    "title": "Novocaine",
    "poster": "https://m.media-amazon.com/images/M/MV5BMWU4MmUxODktMWUwYy00YzM0LTg1ZmItNzVlMTZhOWVlNWFjXkEyXkFqcGc@._V1_FMjpg_UX878_.jpg",
    "trailer": "https://www.youtube.com/watch?v=-PyOIlJEdqA",
    "year": 2025,
    "genres": [
      "Action",
      "Thriller"
    ],
    "director": "Dan Berk & Robert Olsen",
    "actors": [
      "Jack Quaid",
      "Amber Midthunder",
      "Ray Nicholson"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000087",
    "watchUrl": "https://www.justwatch.com/us/search?q=Novocaine"
  },
  {
    "tt": "tt90000088",
    "title": "Materialists",
    "poster": "https://m.media-amazon.com/images/M/MV5BNmQxMTI1YmEtOGY3Yi00NzVlLWEzMjAtYTI1NWZkNDFiMDg1XkEyXkFqcGc@._V1_FMjpg_UY5999_.jpg",
    "trailer": "https://www.youtube.com/watch?v=4A_kmjtsJ7c",
    "year": 2024,
    "genres": [
      "Comedy",
      "Drama",
      "Romance"
    ],
    "director": "Celine Song",
    "actors": [
      "Dakota Johnson",
      "Chris Evans",
      "Pedro Pascal"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000088",
    "watchUrl": "https://www.justwatch.com/us/search?q=Materialists"
  },
  {
    "tt": "tt90000089",
    "title": "Argylle",
    "poster": "https://m.media-amazon.com/images/M/MV5BNDkzMTU2OWUtZjA2ZS00ZmYxLWE2MzgtZDlhZDc1YjM4Yjk5XkEyXkFqcGc@._V1_FMjpg_UY3000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=7mgu9mNZ8Hk",
    "year": 2024,
    "genres": [
      "Spy",
      "Action",
      "Comedy"
    ],
    "director": "Matthew Vaughn",
    "actors": [
      "Henry Cavill",
      "Bryce Dallas Howard",
      "Sam Rockwell"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000089",
    "watchUrl": "https://www.justwatch.com/us/search?q=Argylle"
  },
  {
    "tt": "tt90000090",
    "title": "Air",
    "poster": "https://m.media-amazon.com/images/M/MV5BNjdjYzJkZmUtZDNiMC00MzQ0LWE2MGEtYTk4ZGM4NzFkMzM3XkEyXkFqcGc@._V1_FMjpg_UY2880_.jpg",
    "trailer": "https://www.youtube.com/watch?v=Euy4Yu6B3nU",
    "year": 2023,
    "genres": [
      "Biography",
      "Drama",
      "Sports"
    ],
    "director": "Ben Affleck",
    "actors": [
      "Matt Damon",
      "Ben Affleck",
      "Viola Davis"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000090",
    "watchUrl": "https://www.justwatch.com/us/search?q=Air"
  },
  {
    "tt": "tt90000091",
    "title": "Lee",
    "poster": "https://m.media-amazon.com/images/M/MV5BMDlhMDY0NTAtOTQwZi00ZjIxLTk2ZmYtZjU1Y2FiYWRhZDk3XkEyXkFqcGc@._V1_FMjpg_UY5000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=zRK2X6wBXWI",
    "year": 2023,
    "genres": [
      "Biography",
      "Drama",
      "War"
    ],
    "director": "Ellen Kuras",
    "actors": [
      "Kate Winslet",
      "Andrea Riseborough",
      "Alexander Skarsgård"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000091",
    "watchUrl": "https://www.justwatch.com/us/search?q=Lee"
  },
  {
    "tt": "tt90000092",
    "title": "Are You There God? It's Me, Margaret.",
    "poster": "https://m.media-amazon.com/images/M/MV5BMTY5ZTY1MTQtOGNjOC00ZDRkLWEyNGItNGEyYjJiMzM0MWEwXkEyXkFqcGc@._V1_FMjpg_UY2048_.jpg",
    "trailer": "https://www.youtube.com/watch?v=LzRzojHC3iE",
    "year": 2023,
    "genres": [
      "Comedy",
      "Drama"
    ],
    "director": "Kelly Fremon Craig",
    "actors": [
      "Abby Ryder Fortson",
      "Rachel McAdams",
      "Kathy Bates"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000092",
    "watchUrl": "https://www.justwatch.com/us/search?q=Are%20You%20There%20God%3F%20It's%20Me%2C%20Margaret."
  },
  {
    "tt": "tt90000093",
    "title": "Women Talking",
    "poster": "https://m.media-amazon.com/images/M/MV5BNzM2YzEzOTktNTJiNy00YjAwLWI2N2YtNjBkZWM5Y2U1OTRlXkEyXkFqcGc@._V1_FMjpg_UY4096_.jpg",
    "trailer": "https://www.youtube.com/watch?v=pD0mFhMqDCE",
    "year": 2022,
    "genres": [
      "Drama"
    ],
    "director": "Sarah Polley",
    "actors": [
      "Rooney Mara",
      "Claire Foy",
      "Jessie Buckley"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000093",
    "watchUrl": "https://www.justwatch.com/us/search?q=Women%20Talking"
  },
  {
    "tt": "tt90000094",
    "title": "The Eyes of Tammy Faye",
    "poster": "https://m.media-amazon.com/images/M/MV5BMWM0OWZiZTctN2IxZi00NTY2LWEwZjctOWRiNzYzMTg3NzM0XkEyXkFqcGc@._V1_FMjpg_UX1080_.jpg",
    "trailer": "https://www.youtube.com/watch?v=eMMLRnXPPJk",
    "year": 2023,
    "genres": [
      "Biography",
      "Drama",
      "Sport"
    ],
    "director": "Michael Mann",
    "actors": [
      "Adam Driver",
      "Penélope Cruz",
      "Shailene Woodley"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000094",
    "watchUrl": "https://www.justwatch.com/us/search?q=The%20Eyes%20of%20Tammy%20Faye"
  },
  {
    "tt": "tt90000095",
    "title": "65",
    "poster": "https://m.media-amazon.com/images/M/MV5BYWVjYjg2MDgtODk2NC00MjVkLTk4YWItZmNkZmIyNDg2MzVkXkEyXkFqcGc@._V1_FMjpg_UX1080_.jpg",
    "trailer": "https://www.youtube.com/watch?v=bHXejJq5vr0",
    "year": 2023,
    "genres": [
      "Biography",
      "Drama",
      "History"
    ],
    "director": "George C. Wolfe",
    "actors": [
      "Colman Domingo",
      "Chris Rock",
      "Glynn Turman"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000095",
    "watchUrl": "https://www.justwatch.com/us/search?q=65"
  },
  {
    "tt": "tt90000096",
    "title": "The Life of Chuck",
    "poster": "https://m.media-amazon.com/images/M/MV5BZWIxOGQyYjYtOGEwOC00YWNjLWJmNTktZjJlM2RmNTdjMmVlXkEyXkFqcGc@._V1_FMjpg_UY3000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=dOyXdwXt8d4",
    "year": 2023,
    "genres": [
      "Musical",
      "Drama"
    ],
    "director": "Blitz Bazawule",
    "actors": [
      "Fantasia Barrino",
      "Taraji P. Henson",
      "Danielle Brooks"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000096",
    "watchUrl": "https://www.justwatch.com/us/search?q=The%20Life%20of%20Chuck"
  },
  {
    "tt": "tt90000097",
    "title": "Being the Ricardos",
    "poster": "https://m.media-amazon.com/images/M/MV5BNTdkY2Y0MzgtMmE2ZS00NTc3LWE5MjMtMDk0ZDk3ZTgxZTM0XkEyXkFqcGc@._V1_FMjpg_UY4000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=WvrjCdtB0zM",
    "year": 2021,
    "genres": [
      "Biography",
      "Drama"
    ],
    "director": "Aaron Sorkin",
    "actors": [
      "Nicole Kidman",
      "Javier Bardem",
      "J.K. Simmons"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000097",
    "watchUrl": "https://www.justwatch.com/us/search?q=Being%20the%20Ricardos"
  },
  {
    "tt": "tt90000098",
    "title": "Respect",
    "poster": "https://m.media-amazon.com/images/M/MV5BZGZmODhhMjUtMDFlMS00ZDA5LWFmMjUtOTAwMDUwZWNlYmVmXkEyXkFqcGc@._V1_FMjpg_UY4096_.jpg",
    "trailer": "https://www.youtube.com/watch?v=qTtxoz3OIlU",
    "year": 2021,
    "genres": [
      "Biography",
      "Drama",
      "Music"
    ],
    "director": "Liesl Tommy",
    "actors": [
      "Jennifer Hudson",
      "Forest Whitaker",
      "Marlon Wayans"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000098",
    "watchUrl": "https://www.justwatch.com/us/search?q=Respect"
  },
  {
    "tt": "tt90000099",
    "title": "Hitman's Wife's Bodyguard",
    "poster": "https://m.media-amazon.com/images/M/MV5BY2ZjOWJkMTYtYTI1Yi00YTI5LTg5MWItYmU4NGU0ODViYzQ4XkEyXkFqcGc@._V1_FMjpg_UY2664_.jpg",
    "trailer": "https://www.youtube.com/watch?v=9C0l31YcahQ",
    "year": 2021,
    "genres": [
      "Action",
      "Comedy",
      "Thriller"
    ],
    "director": "Patrick Hughes",
    "actors": [
      "Ryan Reynolds",
      "Samuel L. Jackson",
      "Salma Hayek"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000099",
    "watchUrl": "https://www.justwatch.com/us/search?q=Hitman's%20Wife's%20Bodyguard"
  },
  {
    "tt": "tt90000100",
    "title": "Honest Thief",
    "poster": "https://m.media-amazon.com/images/M/MV5BNmY3Y2E0MzYtY2JjNy00MTNkLTllODYtZDIxY2ZkNWQ5MTRlXkEyXkFqcGc@._V1_FMjpg_UY12000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=jG1X67vnYM0",
    "year": 2021,
    "genres": [
      "Comedy",
      "Drama",
      "Romance"
    ],
    "director": "Wes Anderson",
    "actors": [
      "Bill Murray",
      "Tilda Swinton",
      "Frances McDormand"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90000100",
    "watchUrl": "https://www.justwatch.com/us/search?q=Honest%20Thief"
  }
];

const SEED_LIST_2 = [
  {
    "tt": "tt1895587",
    "title": "Spotlight",
    "poster": "https://m.media-amazon.com/images/M/MV5BMTUyNjAyNzc1M15BMl5BanBnXkFtZTgwMjg0NDc5NzE@._V1_FMjpg_UY2048_.jpg",
    "trailer": "https://www.youtube.com/watch?v=anMa-LM6veM",
    "year": 2015,
    "genres": [
      "Biography",
      "Drama",
      "History"
    ],
    "director": "Tom McCarthy",
    "actors": [
      "Mark Ruffalo",
      "Michael Keaton",
      "Rachel McAdams"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt1895587",
    "watchUrl": "https://www.themoviedb.org/movie/314365/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt4975722",
    "title": "Moonlight",
    "poster": "https://m.media-amazon.com/images/M/MV5BNzQxNTIyODAxMV5BMl5BanBnXkFtZTgwNzQyMDA3OTE@._V1_FMjpg_UY4096_.jpg",
    "trailer": "https://www.youtube.com/watch?v=5fYFIj16YC0",
    "year": 2016,
    "genres": [
      "Drama",
      "Coming-of-Age"
    ],
    "director": "Barry Jenkins",
    "actors": [
      "Mahershala Ali",
      "Trevante Rhodes",
      "Naomie Harris"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt4975722",
    "watchUrl": "https://www.themoviedb.org/movie/376867/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt1375666",
    "title": "Inception",
    "poster": "https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_FMjpg_UX700_.jpg",
    "trailer": "https://www.youtube.com/watch?v=B4IXWfyrrhc",
    "year": 2010,
    "genres": [
      "Sci-Fi",
      "Action",
      "Thriller"
    ],
    "director": "Christopher Nolan",
    "actors": [
      "Leonardo DiCaprio",
      "Joseph Gordon-Levitt",
      "Ellen Page"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt1375666",
    "watchUrl": "https://www.themoviedb.org/movie/27205/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt4912910",
    "title": "Mission: Impossible - Fallout",
    "poster": "https://m.media-amazon.com/images/M/MV5BZmUwZTg2YmMtMmZjOS00ZDYwLWI2ZDgtZDcyY2ZmMWMwZDdlXkEyXkFqcGc@._V1_FMjpg_UY4998_.jpg",
    "trailer": "https://www.youtube.com/watch?v=XiHiW4N7-bo",
    "year": 2018,
    "genres": [
      "Action",
      "Adventure",
      "Spy",
      "Thriller"
    ],
    "director": "Christopher McQuarrie",
    "actors": [
      "Tom Cruise",
      "Henry Cavill",
      "Rebecca Ferguson"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt4912910",
    "watchUrl": "https://www.themoviedb.org/movie/353081/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt2562232",
    "title": "Birdman or (The Unexpected Virtue of Ignorance)",
    "poster": "https://m.media-amazon.com/images/M/MV5BODAzNDMxMzAxOV5BMl5BanBnXkFtZTgwMDMxMjA4MjE@._V1_FMjpg_UY2048_.jpg",
    "trailer": "https://www.youtube.com/watch?v=E31lXE0zmJ8",
    "year": 2014,
    "genres": [
      "Dark Comedy",
      "Drama",
      "Satire"
    ],
    "director": "Alejandro G. Iñárritu",
    "actors": [
      "Michael Keaton",
      "Edward Norton",
      "Emma Stone"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt2562232",
    "watchUrl": "https://www.themoviedb.org/movie/194662/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt6966692",
    "title": "Green Book",
    "poster": "https://m.media-amazon.com/images/M/MV5BMTI0MzAxOWEtODU5Zi00MzU5LWEzMjEtM2U5ODc4NWFmNjI4XkEyXkFqcGc@._V1_FMjpg_UY2016_.jpg",
    "trailer": "https://www.youtube.com/watch?v=jdlzE7klSxg",
    "year": 2018,
    "genres": [
      "Biography",
      "Comedy-Drama"
    ],
    "director": "Peter Farrelly",
    "actors": [
      "Viggo Mortensen",
      "Mahershala Ali",
      "Linda Cardellini"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt6966692",
    "watchUrl": "https://www.themoviedb.org/movie/490132/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt1856101",
    "title": "Blade Runner 2049",
    "poster": "https://m.media-amazon.com/images/M/MV5BNzA1Njg4NzYxOV5BMl5BanBnXkFtZTgwODk5NjU3MzI@._V1_FMjpg_UY2048_.jpg",
    "trailer": "https://www.youtube.com/watch?v=dZOaI_Fn5o4",
    "year": 2017,
    "genres": [
      "Sci-Fi",
      "Neo-Noir",
      "Thriller"
    ],
    "director": "Denis Villeneuve",
    "actors": [
      "Ryan Gosling",
      "Harrison Ford",
      "Ana de Armas"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt1856101",
    "watchUrl": "https://www.themoviedb.org/movie/335984/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt5580390",
    "title": "The Shape of Water",
    "poster": "https://m.media-amazon.com/images/M/MV5BOGFlMTM2MTgtZDdlMy00ZDZlLWFjOTUtZDMzMGEwNmNiMWY0XkEyXkFqcGc@._V1_FMjpg_UY2048_.jpg",
    "trailer": "https://www.youtube.com/watch?v=XFYWazblaUA",
    "year": 2017,
    "genres": [
      "Fantasy",
      "Romance",
      "Drama"
    ],
    "director": "Guillermo del Toro",
    "actors": [
      "Sally Hawkins",
      "Michael Shannon",
      "Richard Jenkins"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt5580390",
    "watchUrl": "https://www.themoviedb.org/movie/399055/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt2024544",
    "title": "12 Years a Slave",
    "poster": "https://m.media-amazon.com/images/M/MV5BMjExMTEzODkyN15BMl5BanBnXkFtZTcwNTU4NTc4OQ@@._V1_FMjpg_UX509_.jpg",
    "trailer": "https://www.youtube.com/watch?v=81FevNUImC4",
    "year": 2013,
    "genres": [
      "Biography",
      "Drama",
      "History"
    ],
    "director": "Steve McQueen",
    "actors": [
      "Chiwetel Ejiofor",
      "Michael Fassbender",
      "Lupita Nyong'o"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt2024544",
    "watchUrl": "https://www.themoviedb.org/movie/76203/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt5052448",
    "title": "Get Out",
    "poster": "https://m.media-amazon.com/images/M/MV5BMjUxMDQwNjcyNl5BMl5BanBnXkFtZTgwNzcwMzc0MTI@._V1_FMjpg_UY2048_.jpg",
    "trailer": "https://www.youtube.com/watch?v=sRfnevzM9kQ",
    "year": 2017,
    "genres": [
      "Horror",
      "Mystery",
      "Thriller"
    ],
    "director": "Jordan Peele",
    "actors": [
      "Daniel Kaluuya",
      "Allison Williams",
      "Bradley Whitford"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt5052448",
    "watchUrl": "https://www.themoviedb.org/movie/419430/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt1392190",
    "title": "Mad Max: Fury Road",
    "poster": "https://m.media-amazon.com/images/M/MV5BZDRkODJhOTgtOTc1OC00NTgzLTk4NjItNDgxZDY4YjlmNDY2XkEyXkFqcGc@._V1_FMjpg_UX675_.jpg",
    "trailer": "https://www.youtube.com/watch?v=hEJnMQG9ev8",
    "year": 2015,
    "genres": [
      "Action",
      "Adventure",
      "Sci-Fi"
    ],
    "director": "George Miller",
    "actors": [
      "Tom Hardy",
      "Charlize Theron",
      "Nicholas Hoult"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt1392190",
    "watchUrl": "https://www.themoviedb.org/movie/76341/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0435761",
    "title": "Toy Story 3",
    "poster": "https://m.media-amazon.com/images/M/MV5BMTgxOTY4Mjc0MF5BMl5BanBnXkFtZTcwNTA4MDQyMw@@._V1_FMjpg_UY2048_.jpg",
    "trailer": "https://www.youtube.com/watch?v=2BlMNH1QTeE",
    "year": 2010,
    "genres": [
      "Animation",
      "Family",
      "Adventure"
    ],
    "director": "Lee Unkrich",
    "actors": [
      "Tom Hanks",
      "Tim Allen",
      "Joan Cusack"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0435761",
    "watchUrl": "https://www.themoviedb.org/movie/10193/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt3450958",
    "title": "War for the Planet of the Apes",
    "poster": "https://m.media-amazon.com/images/M/MV5BMzNhMzNiZDYtMzYxYy00YTYwLTkxNmYtNTJhOGU1Yjg5ODI5XkEyXkFqcGc@._V1_FMjpg_UY2048_.jpg",
    "trailer": "https://www.youtube.com/watch?v=hHUBpMznFJI",
    "year": 2017,
    "genres": [
      "Sci-Fi",
      "Action",
      "Drama"
    ],
    "director": "Matt Reeves",
    "actors": [
      "Andy Serkis",
      "Woody Harrelson",
      "Steve Zahn"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt3450958",
    "watchUrl": "https://www.themoviedb.org/movie/281338/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt2543164",
    "title": "Arrival",
    "poster": "https://m.media-amazon.com/images/M/MV5BMTExMzU0ODcxNDheQTJeQWpwZ15BbWU4MDE1OTI4MzAy._V1_FMjpg_UY2048_.jpg",
    "trailer": "https://www.youtube.com/watch?v=tFMo3UJ4B4g",
    "year": 2016,
    "genres": [
      "Sci-Fi",
      "Mystery",
      "Drama"
    ],
    "director": "Denis Villeneuve",
    "actors": [
      "Amy Adams",
      "Jeremy Renner",
      "Forest Whitaker"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt2543164",
    "watchUrl": "https://www.themoviedb.org/movie/329865/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt3783958",
    "title": "La La Land",
    "poster": "https://m.media-amazon.com/images/M/MV5BMzUzNDM2NzM2MV5BMl5BanBnXkFtZTgwNTM3NTg4OTE@._V1_FMjpg_UY6000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=0pdqf4P9MB8",
    "year": 2016,
    "genres": [
      "Musical",
      "Romance",
      "Drama"
    ],
    "director": "Damien Chazelle",
    "actors": [
      "Ryan Gosling",
      "Emma Stone",
      "John Legend"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt3783958",
    "watchUrl": "https://www.themoviedb.org/movie/313369/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt2582802",
    "title": "Whiplash",
    "poster": "https://m.media-amazon.com/images/M/MV5BMDFjOWFkYzktYzhhMC00NmYyLTkwY2EtYjViMDhmNzg0OGFkXkEyXkFqcGc@._V1_FMjpg_UY5333_.jpg",
    "trailer": "https://www.youtube.com/watch?v=7d_jQycdQGo",
    "year": 2014,
    "genres": [
      "Drama",
      "Music"
    ],
    "director": "Damien Chazelle",
    "actors": [
      "Miles Teller",
      "J.K. Simmons",
      "Paul Reiser"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt2582802",
    "watchUrl": "https://www.themoviedb.org/movie/244786/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt1065073",
    "title": "Boyhood",
    "poster": "https://m.media-amazon.com/images/M/MV5BMTYzNDc2MDc0N15BMl5BanBnXkFtZTgwOTcwMDQ5MTE@._V1_FMjpg_UX1000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=IiDztHS3Wos",
    "year": 2014,
    "genres": [
      "Drama",
      "Coming-of-Age"
    ],
    "director": "Richard Linklater",
    "actors": [
      "Ellar Coltrane",
      "Patricia Arquette",
      "Ethan Hawke"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt1065073",
    "watchUrl": "https://www.themoviedb.org/movie/85350/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt1655442",
    "title": "The Artist",
    "poster": "https://m.media-amazon.com/images/M/MV5BZDI0NjFkNTItNTRiYy00YTE3LWI3MDgtMjY0ZmQyNmU1OTQ1XkEyXkFqcGc@._V1_FMjpg_UY2266_.jpg",
    "trailer": "https://www.youtube.com/watch?v=YB9Oq0hn5KY",
    "year": 2011,
    "genres": [
      "Comedy",
      "Romance",
      "Drama"
    ],
    "director": "Michel Hazanavicius",
    "actors": [
      "Jean Dujardin",
      "Bérénice Bejo",
      "John Goodman"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt1655442",
    "watchUrl": "https://www.themoviedb.org/movie/74643/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt5027774",
    "title": "Three Billboards Outside Ebbing, Missouri",
    "poster": "https://m.media-amazon.com/images/M/MV5BMjI0ODcxNzM1N15BMl5BanBnXkFtZTgwMzIwMTEwNDI@._V1_FMjpg_UX1012_.jpg",
    "trailer": "https://www.youtube.com/watch?v=YpIU1STH8ac",
    "year": 2017,
    "genres": [
      "Crime",
      "Drama",
      "Dark Comedy"
    ],
    "director": "Martin McDonagh",
    "actors": [
      "Frances McDormand",
      "Woody Harrelson",
      "Sam Rockwell"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt5027774",
    "watchUrl": "https://www.themoviedb.org/movie/359940/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt1790885",
    "title": "Zero Dark Thirty",
    "poster": "https://m.media-amazon.com/images/M/MV5BMTQ4OTUyNzcwN15BMl5BanBnXkFtZTcwMTQ1NDE3OA@@._V1_FMjpg_UX1012_.jpg",
    "trailer": "https://www.youtube.com/watch?v=k7R2uVZYebE",
    "year": 2012,
    "genres": [
      "Thriller",
      "War",
      "Drama"
    ],
    "director": "Kathryn Bigelow",
    "actors": [
      "Jessica Chastain",
      "Jason Clarke",
      "Joel Edgerton"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt1790885",
    "watchUrl": "https://www.themoviedb.org/movie/97630/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt5013056",
    "title": "Dunkirk",
    "poster": "https://m.media-amazon.com/images/M/MV5BMjU3YzY2ZWYtNjljOC00NDEwLWE1NWEtZmZiZDA4MDJmM2FjXkEyXkFqcGc@._V1_FMjpg_UY2428_.jpg",
    "trailer": "https://www.youtube.com/watch?v=T7O7BtBnsG4",
    "year": 2017,
    "genres": [
      "War",
      "Drama",
      "Thriller"
    ],
    "director": "Christopher Nolan",
    "actors": [
      "Fionn Whitehead",
      "Tom Hardy",
      "Kenneth Branagh"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt5013056",
    "watchUrl": "https://www.themoviedb.org/movie/374720/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt3315342",
    "title": "Logan",
    "poster": "https://m.media-amazon.com/images/M/MV5BM2JjODdkMGMtNmY2YS00OGM2LThiY2YtZGYyNzE4Nzc2ODA0XkEyXkFqcGc@._V1_FMjpg_UX520_.jpg",
    "trailer": "https://www.youtube.com/watch?v=RH3OxVFvTeg",
    "year": 2017,
    "genres": [
      "Action",
      "Drama",
      "Sci-Fi",
      "Superhero"
    ],
    "director": "James Mangold",
    "actors": [
      "Hugh Jackman",
      "Patrick Stewart",
      "Dafne Keen"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt3315342",
    "watchUrl": "https://www.themoviedb.org/movie/263115/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt2582782",
    "title": "Hell or High Water",
    "poster": "https://m.media-amazon.com/images/M/MV5BMTg4NDA1OTA5NF5BMl5BanBnXkFtZTgwMDQ2MDM5ODE@._V1_FMjpg_UY4096_.jpg",
    "trailer": "https://www.youtube.com/watch?v=Uzw4wkHtEt4",
    "year": 2016,
    "genres": [
      "Crime",
      "Drama",
      "Thriller",
      "Neo-Western"
    ],
    "director": "David Mackenzie",
    "actors": [
      "Chris Pine",
      "Ben Foster",
      "Jeff Bridges"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt2582782",
    "watchUrl": "https://www.themoviedb.org/movie/338766/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt3498820",
    "title": "Captain America: Civil War",
    "poster": "https://m.media-amazon.com/images/M/MV5BMjQ0MTgyNjAxMV5BMl5BanBnXkFtZTgwNjUzMDkyODE@._V1_FMjpg_UY2048_.jpg",
    "trailer": "https://www.youtube.com/watch?v=xnv__ogkt0M",
    "year": 2016,
    "genres": [
      "Action",
      "Superhero",
      "Adventure"
    ],
    "director": "Anthony Russo",
    "actors": [
      "Chris Evans",
      "Robert Downey Jr.",
      "Scarlett Johansson"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt3498820",
    "watchUrl": "https://www.themoviedb.org/movie/271110/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt90010025",
    "title": "Star Wars: Episode VII - The Force Awakens",
    "poster": "https://m.media-amazon.com/images/M/MV5BOTAzODEzNDAzMl5BMl5BanBnXkFtZTgwMDU1MTgzNzE@._V1_FMjpg_UY3240_.jpg",
    "trailer": "https://www.youtube.com/watch?v=sGbxmsDFVnE",
    "year": 2015,
    "genres": [
      "Action",
      "Adventure",
      "Sci-Fi"
    ],
    "director": "J.J. Abrams",
    "actors": [
      "Daisy Ridley",
      "John Boyega",
      "Harrison Ford"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90010025",
    "watchUrl": "https://www.justwatch.com/us/search?q=Star%20Wars%3A%20Episode%20VII%20-%20The%20Force%20Awakens"
  },
  {
    "tt": "tt90010026",
    "title": "Argo",
    "poster": "https://m.media-amazon.com/images/M/MV5BM2QyMGUyZTEtMjE4Yi00M2RiLTgwN2QtZDMxZDNiMTFkMTFjXkEyXkFqcGc@._V1_FMjpg_UY3000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=JW3WfSFgrVY",
    "year": 2012,
    "genres": [
      "Biography",
      "Drama",
      "Thriller"
    ],
    "director": "Ben Affleck",
    "actors": [
      "Ben Affleck",
      "Bryan Cranston",
      "John Goodman"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90010026",
    "watchUrl": "https://www.justwatch.com/us/search?q=Argo"
  },
  {
    "tt": "tt90010027",
    "title": "Gravity",
    "poster": "https://m.media-amazon.com/images/M/MV5BNjE5MzYwMzYxMF5BMl5BanBnXkFtZTcwOTk4MTk0OQ@@._V1_FMjpg_UX680_.jpg",
    "trailer": "https://www.youtube.com/watch?v=OiTiKOy59o4",
    "year": 2013,
    "genres": [
      "Sci-Fi",
      "Thriller",
      "Drama"
    ],
    "director": "Alfonso Cuarón",
    "actors": [
      "Sandra Bullock",
      "George Clooney",
      "Ed Harris"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90010027",
    "watchUrl": "https://www.justwatch.com/us/search?q=Gravity"
  },
  {
    "tt": "tt90010028",
    "title": "The Social Network",
    "poster": "https://m.media-amazon.com/images/M/MV5BYzMxZDBkZDQtNzdmYy00MjdjLThkNDUtZjQ3MDcxNDkyMTdhXkEyXkFqcGc@._V1_FMjpg_UY3000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=lB95KLmpLR4",
    "year": 2010,
    "genres": [
      "Biography",
      "Drama"
    ],
    "director": "David Fincher",
    "actors": [
      "Jesse Eisenberg",
      "Andrew Garfield",
      "Justin Timberlake"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90010028",
    "watchUrl": "https://www.justwatch.com/us/search?q=The%20Social%20Network"
  },
  {
    "tt": "tt90010029",
    "title": "The Revenant",
    "poster": "https://m.media-amazon.com/images/M/MV5BYTgwNmQzZDctMjNmOS00OTExLTkwM2UtNzJmOTJhODFjOTdlXkEyXkFqcGc@._V1_FMjpg_UY2838_.jpg",
    "trailer": "https://www.youtube.com/watch?v=LoebZZ8K5N0",
    "year": 2015,
    "genres": [
      "Adventure",
      "Drama",
      "Thriller"
    ],
    "director": "Alejandro G. Iñárritu",
    "actors": [
      "Leonardo DiCaprio",
      "Tom Hardy",
      "Domhnall Gleeson"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90010029",
    "watchUrl": "https://www.justwatch.com/us/search?q=The%20Revenant"
  },
  {
    "tt": "tt90010030",
    "title": "The Wolf of Wall Street",
    "poster": "https://m.media-amazon.com/images/M/MV5BMjIxMjgxNTk0MF5BMl5BanBnXkFtZTgwNjIyOTg2MDE@._V1_FMjpg_UY2048_.jpg",
    "trailer": "https://www.youtube.com/watch?v=iszwuX1AK6A",
    "year": 2013,
    "genres": [
      "Biography",
      "Comedy",
      "Crime"
    ],
    "director": "Martin Scorsese",
    "actors": [
      "Leonardo DiCaprio",
      "Jonah Hill",
      "Margot Robbie"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90010030",
    "watchUrl": "https://www.justwatch.com/us/search?q=The%20Wolf%20of%20Wall%20Street"
  },
  {
    "tt": "tt90010031",
    "title": "Room",
    "poster": "https://m.media-amazon.com/images/M/MV5BMjE4NzgzNzEwMl5BMl5BanBnXkFtZTgwMTMzMDE0NjE@._V1_FMjpg_UX972_.jpg",
    "trailer": "https://www.youtube.com/watch?v=E_Ci-pAL4eE",
    "year": 2015,
    "genres": [
      "Drama",
      "Thriller"
    ],
    "director": "Lenny Abrahamson",
    "actors": [
      "Brie Larson",
      "Jacob Tremblay",
      "Joan Allen"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90010031",
    "watchUrl": "https://www.justwatch.com/us/search?q=Room"
  },
  {
    "tt": "tt90010032",
    "title": "Django Unchained",
    "poster": "https://m.media-amazon.com/images/M/MV5BMjIyNTQ5NjQ1OV5BMl5BanBnXkFtZTcwODg1MDU4OA@@._V1_FMjpg_UY2048_.jpg",
    "trailer": "https://www.youtube.com/watch?v=0fUCuvNlOCg",
    "year": 2012,
    "genres": [
      "Drama",
      "Western"
    ],
    "director": "Quentin Tarantino",
    "actors": [
      "Jamie Foxx",
      "Christoph Waltz",
      "Leonardo DiCaprio"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90010032",
    "watchUrl": "https://www.justwatch.com/us/search?q=Django%20Unchained"
  },
  {
    "tt": "tt90010033",
    "title": "Skyfall",
    "poster": "https://m.media-amazon.com/images/M/MV5BNjAzMWNkODUtM2FlMi00NzgyLWJhMGUtMWEyNDYyZGFiN2RlXkEyXkFqcGc@._V1_FMjpg_UX691_.jpg",
    "trailer": "https://www.youtube.com/watch?v=6kw1UVovByw",
    "year": 2012,
    "genres": [
      "Action",
      "Adventure",
      "Thriller"
    ],
    "director": "Sam Mendes",
    "actors": [
      "Daniel Craig",
      "Javier Bardem",
      "Judi Dench"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90010033",
    "watchUrl": "https://www.justwatch.com/us/search?q=Skyfall"
  },
  {
    "tt": "tt90010034",
    "title": "Drive",
    "poster": "https://m.media-amazon.com/images/M/MV5BYTFmNTFlOTAtNzEyNi00MWU2LTg3MGEtYjA2NWY3MDliNjlkXkEyXkFqcGc@._V1_FMjpg_UY5000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=KBiOF3y1W0Y",
    "year": 2011,
    "genres": [
      "Crime",
      "Drama",
      "Thriller"
    ],
    "director": "Nicolas Winding Refn",
    "actors": [
      "Ryan Gosling",
      "Carey Mulligan",
      "Bryan Cranston"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90010034",
    "watchUrl": "https://www.justwatch.com/us/search?q=Drive"
  },
  {
    "tt": "tt90010035",
    "title": "Anomalisa",
    "poster": "https://m.media-amazon.com/images/M/MV5BMTkyMzI2MzQ1N15BMl5BanBnXkFtZTgwNDg0MzQxNzE@._V1_FMjpg_UX517_.jpg",
    "trailer": "https://www.youtube.com/watch?v=WQkHA3fHk_0",
    "year": 2015,
    "genres": [
      "Animation",
      "Drama",
      "Romance"
    ],
    "director": "Charlie Kaufman & Duke Johnson",
    "actors": [
      "David Thewlis",
      "Jennifer Jason Leigh",
      "Tom Noonan"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90010035",
    "watchUrl": "https://www.justwatch.com/us/search?q=Anomalisa"
  },
  {
    "tt": "tt90010036",
    "title": "Deadpool",
    "poster": "https://m.media-amazon.com/images/M/MV5BNzY3ZWU5NGQtOTViNC00ZWVmLTliNjAtNzViNzlkZWQ4YzQ4XkEyXkFqcGc@._V1_FMjpg_UY3000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=ONHBaC-pfsk",
    "year": 2016,
    "genres": [
      "Action",
      "Comedy"
    ],
    "director": "Tim Miller",
    "actors": [
      "Ryan Reynolds",
      "Morena Baccarin",
      "T.J. Miller"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90010036",
    "watchUrl": "https://www.justwatch.com/us/search?q=Deadpool"
  },
  {
    "tt": "tt90010037",
    "title": "The King's Speech",
    "poster": "https://m.media-amazon.com/images/M/MV5BMzU5MjEwMTg2Nl5BMl5BanBnXkFtZTcwNzM3MTYxNA@@._V1_FMjpg_UY2048_.jpg",
    "trailer": "https://www.youtube.com/watch?v=EcxBrTvLbBM",
    "year": 2010,
    "genres": [
      "Biography",
      "Drama",
      "History"
    ],
    "director": "Tom Hooper",
    "actors": [
      "Colin Firth",
      "Geoffrey Rush",
      "Helena Bonham Carter"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90010037",
    "watchUrl": "https://www.justwatch.com/us/search?q=The%20King's%20Speech"
  },
  {
    "tt": "tt90010038",
    "title": "Manchester by the Sea",
    "poster": "https://m.media-amazon.com/images/M/MV5BMTYxMjk0NDg4Ml5BMl5BanBnXkFtZTgwODcyNjA5OTE@._V1_FMjpg_UY2048_.jpg",
    "trailer": "https://www.youtube.com/watch?v=gsVoD0pTge0",
    "year": 2016,
    "genres": [
      "Drama"
    ],
    "director": "Kenneth Lonergan",
    "actors": [
      "Casey Affleck",
      "Michelle Williams",
      "Kyle Chandler"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90010038",
    "watchUrl": "https://www.justwatch.com/us/search?q=Manchester%20by%20the%20Sea"
  },
  {
    "tt": "tt90010039",
    "title": "Incendies",
    "poster": "https://m.media-amazon.com/images/M/MV5BYWFmMjdmNjctNzhhOC00ZmMzLTkwOGItMmVmZDU4MjE2MTYwXkEyXkFqcGc@._V1_FMjpg_UX1200_.jpg",
    "trailer": "https://www.youtube.com/watch?v=XJ69WnwvZhE",
    "year": 2010,
    "genres": [
      "Drama",
      "Mystery",
      "War"
    ],
    "director": "Denis Villeneuve",
    "actors": [
      "Lubna Azabal",
      "Mélissa Désormeaux-Poulin",
      "Maxim Gaudette"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90010039",
    "watchUrl": "https://www.justwatch.com/us/search?q=Incendies"
  },
  {
    "tt": "tt90010040",
    "title": "Philomena",
    "poster": "https://m.media-amazon.com/images/M/MV5BMjA5ODgyNzcxMV5BMl5BanBnXkFtZTgwMzkzOTYzMDE@._V1_FMjpg_UY2048_.jpg",
    "trailer": "https://www.youtube.com/watch?v=x6ToSr_LSKU",
    "year": 2013,
    "genres": [
      "Biography",
      "Drama"
    ],
    "director": "Stephen Frears",
    "actors": [
      "Judi Dench",
      "Steve Coogan",
      "Sophie Kennedy Clark"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90010040",
    "watchUrl": "https://www.justwatch.com/us/search?q=Philomena"
  },
  {
    "tt": "tt90010041",
    "title": "Wild Tales",
    "poster": "https://m.media-amazon.com/images/M/MV5BNzAzMjA1ODAxOV5BMl5BanBnXkFtZTgwODg4NTQzNDE@._V1_FMjpg_UY2048_.jpg",
    "trailer": "https://www.youtube.com/watch?v=x6ToSr_LSKU",
    "year": 2014,
    "genres": [
      "Comedy",
      "Drama",
      "Thriller"
    ],
    "director": "Damián Szifron",
    "actors": [
      "Ricardo Darín",
      "Oscar Martínez",
      "Leonardo Sbaraglia"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90010041",
    "watchUrl": "https://www.justwatch.com/us/search?q=Wild%20Tales"
  },
  {
    "tt": "tt90010042",
    "title": "Captain America: The Winter Soldier",
    "poster": "https://m.media-amazon.com/images/M/MV5BNWY1NjFmNDItZDhmOC00NjI1LWE0ZDItMTM0MjBjZThiOTQ2XkEyXkFqcGc@._V1_FMjpg_UY2500_.jpg",
    "trailer": "https://www.youtube.com/watch?v=7SlILk2WMTI",
    "year": 2014,
    "genres": [
      "Action",
      "Adventure",
      "Sci-Fi"
    ],
    "director": "Anthony Russo & Joe Russo",
    "actors": [
      "Chris Evans",
      "Scarlett Johansson",
      "Sebastian Stan"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90010042",
    "watchUrl": "https://www.justwatch.com/us/search?q=Captain%20America%3A%20The%20Winter%20Soldier"
  },
  {
    "tt": "tt90010043",
    "title": "A Separation",
    "poster": "https://m.media-amazon.com/images/M/MV5BMDM0ZWRmMzctM2M5ZS00ZjU0LWIxN2MtNWNlNGY1ZDhjMDVhXkEyXkFqcGc@._V1_FMjpg_UX540_.jpg",
    "trailer": "https://www.youtube.com/watch?v=58Onuy5USTc",
    "year": 2011,
    "genres": [
      "Drama",
      "Family"
    ],
    "director": "Asghar Farhadi",
    "actors": [
      "Peyman Moaadi",
      "Leila Hatami",
      "Sareh Bayat"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90010043",
    "watchUrl": "https://www.justwatch.com/us/search?q=A%20Separation"
  },
  {
    "tt": "tt90010044",
    "title": "The Avengers",
    "poster": "https://m.media-amazon.com/images/M/MV5BNGE0YTVjNzUtNzJjOS00NGNlLTgxMzctZTY4YTE1Y2Y1ZTU4XkEyXkFqcGc@._V1_FMjpg_UX800_.jpg",
    "trailer": "https://www.youtube.com/watch?v=eOrNdBpGMv8",
    "year": 2012,
    "genres": [
      "Action",
      "Adventure",
      "Sci-Fi"
    ],
    "director": "Joss Whedon",
    "actors": [
      "Robert Downey Jr.",
      "Chris Evans",
      "Scarlett Johansson"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90010044",
    "watchUrl": "https://www.justwatch.com/us/search?q=The%20Avengers"
  },
  {
    "tt": "tt90010045",
    "title": "Son of Saul",
    "poster": "https://m.media-amazon.com/images/M/MV5BNTMwNTI0MDktNGJiYS00ZWQ0LTgyZDgtMzU2MjkzZTkxNDBhXkEyXkFqcGc@._V1_FMjpg_UY3000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=PSabBa9IWYs",
    "year": 2015,
    "genres": [
      "Drama",
      "War"
    ],
    "director": "László Nemes",
    "actors": [
      "Géza Röhrig",
      "Levente Molnár",
      "Urs Rechn"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90010045",
    "watchUrl": "https://www.justwatch.com/us/search?q=Son%20of%20Saul"
  },
  {
    "tt": "tt90010046",
    "title": "The Grand Budapest Hotel",
    "poster": "https://m.media-amazon.com/images/M/MV5BMzM5NjUxOTEyMl5BMl5BanBnXkFtZTgwNjEyMDM0MDE@._V1_FMjpg_UY2000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=1Fg5iWmQjwk",
    "year": 2014,
    "genres": [
      "Comedy",
      "Drama"
    ],
    "director": "Wes Anderson",
    "actors": [
      "Ralph Fiennes",
      "Tony Revolori",
      "Saoirse Ronan"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90010046",
    "watchUrl": "https://www.justwatch.com/us/search?q=The%20Grand%20Budapest%20Hotel"
  },
  {
    "tt": "tt90010047",
    "title": "The Tree of Life",
    "poster": "https://m.media-amazon.com/images/M/MV5BMTMwNjQ0NjMzN15BMl5BanBnXkFtZTcwNjMxMTkyNA@@._V1_FMjpg_UY2048_.jpg",
    "trailer": "https://www.youtube.com/watch?v=RrAz1YLh8nY",
    "year": 2011,
    "genres": [
      "Drama",
      "Fantasy"
    ],
    "director": "Terrence Malick",
    "actors": [
      "Brad Pitt",
      "Sean Penn",
      "Jessica Chastain"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90010047",
    "watchUrl": "https://www.justwatch.com/us/search?q=The%20Tree%20of%20Life"
  },
  {
    "tt": "tt90010048",
    "title": "Black Swan",
    "poster": "https://m.media-amazon.com/images/M/MV5BNzY2NzI4OTE5MF5BMl5BanBnXkFtZTcwMjMyNDY4Mw@@._V1_FMjpg_UY2048_.jpg",
    "trailer": "https://www.youtube.com/watch?v=5jaI1XOB-bs",
    "year": 2010,
    "genres": [
      "Drama",
      "Thriller"
    ],
    "director": "Darren Aronofsky",
    "actors": [
      "Natalie Portman",
      "Mila Kunis",
      "Vincent Cassel"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90010048",
    "watchUrl": "https://www.justwatch.com/us/search?q=Black%20Swan"
  }
];

const SEED_LIST_3 = [
  {
    "tt": "tt0172495",
    "title": "Gladiator",
    "poster": "https://m.media-amazon.com/images/M/MV5BYWQ4YmNjYjEtOWE1Zi00Y2U4LWI4NTAtMTU0MjkxNWQ1ZmJiXkEyXkFqcGc@._V1_FMjpg_UY2599_.jpg",
    "trailer": "https://www.youtube.com/watch?v=owK1qxDselE",
    "year": 2000,
    "genres": [
      "Action",
      "Adventure",
      "Drama",
      "Epic"
    ],
    "director": "Ridley Scott",
    "actors": [
      "Russell Crowe",
      "Joaquin Phoenix",
      "Connie Nielsen"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0172495",
    "watchUrl": "https://www.themoviedb.org/movie/98/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0468569",
    "title": "The Dark Knight",
    "poster": "https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_FMjpg_UY2048_.jpg",
    "trailer": "https://www.youtube.com/watch?v=EXeTwQWrcwY",
    "year": 2008,
    "genres": [
      "Action",
      "Crime",
      "Drama",
      "Superhero"
    ],
    "director": "Christopher Nolan",
    "actors": [
      "Christian Bale",
      "Heath Ledger",
      "Aaron Eckhart"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0468569",
    "watchUrl": "https://www.themoviedb.org/movie/155/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt1010048",
    "title": "Slumdog Millionaire",
    "poster": "https://m.media-amazon.com/images/M/MV5BY2ZlMjIwN2QtOWUxZC00M2U2LWJiODEtZmY1ODdiYWZjZjNmXkEyXkFqcGc@._V1_FMjpg_UX1080_.jpg",
    "trailer": "https://www.youtube.com/watch?v=AIzbwV7on6Q",
    "year": 2008,
    "genres": [
      "Drama",
      "Romance"
    ],
    "director": "Danny Boyle",
    "actors": [
      "Dev Patel",
      "Freida Pinto",
      "Anil Kapoor"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt1010048",
    "watchUrl": "https://www.themoviedb.org/movie/12405/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0407887",
    "title": "The Departed",
    "poster": "https://m.media-amazon.com/images/M/MV5BMTI1MTY2OTIxNV5BMl5BanBnXkFtZTYwNjQ4NjY3._V1_FMjpg_UX450_.jpg",
    "trailer": "https://www.youtube.com/watch?v=iojhqm0JTW4",
    "year": 2006,
    "genres": [
      "Crime",
      "Drama",
      "Thriller"
    ],
    "director": "Martin Scorsese",
    "actors": [
      "Leonardo DiCaprio",
      "Matt Damon",
      "Jack Nicholson"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0407887",
    "watchUrl": "https://www.themoviedb.org/movie/1422/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0167260",
    "title": "The Lord of the Rings: The Return of the King",
    "poster": "https://m.media-amazon.com/images/M/MV5BMTZkMjBjNWMtZGI5OC00MGU0LTk4ZTItODg2NWM3NTVmNWQ4XkEyXkFqcGc@._V1_FMjpg_UX800_.jpg",
    "trailer": "https://www.youtube.com/watch?v=r5X-hFf6Bwo",
    "year": 2003,
    "genres": [
      "Fantasy",
      "Adventure",
      "Drama",
      "Epic"
    ],
    "director": "Peter Jackson",
    "actors": [
      "Elijah Wood",
      "Viggo Mortensen",
      "Ian McKellen"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0167260",
    "watchUrl": "https://www.themoviedb.org/movie/122/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0457430",
    "title": "Pan's Labyrinth",
    "poster": "https://m.media-amazon.com/images/M/MV5BOTc1NTAxMWItMWFlNy00MmU2LTkwMTMtNzMwOTg5OTQ5YTFiXkEyXkFqcGc@._V1_FMjpg_UY2892_.jpg",
    "trailer": "https://www.youtube.com/watch?v=EqYiSlkvRuw",
    "year": 2006,
    "genres": [
      "Fantasy",
      "War",
      "Drama"
    ],
    "director": "Guillermo del Toro",
    "actors": [
      "Ivana Baquero",
      "Sergi López",
      "Maribel Verdú"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0457430",
    "watchUrl": "https://www.themoviedb.org/movie/1417/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0450259",
    "title": "Blood Diamond",
    "poster": "https://m.media-amazon.com/images/M/MV5BOTcwMmQ1YjAtZjBkMi00N2VhLWEzYTAtMDc0ODliZmQ4Nzc1XkEyXkFqcGc@._V1_FMjpg_UY3579_.jpg",
    "trailer": "https://www.youtube.com/watch?v=yknIZsvQjG4",
    "year": 2006,
    "genres": [
      "Adventure",
      "Drama",
      "Thriller"
    ],
    "director": "Edward Zwick",
    "actors": [
      "Leonardo DiCaprio",
      "Djimon Hounsou",
      "Jennifer Connelly"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0450259",
    "watchUrl": "https://www.themoviedb.org/movie/1372/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0317248",
    "title": "City of God",
    "poster": "https://m.media-amazon.com/images/M/MV5BYWJhZjVmN2QtMzdmMi00ZThjLThkODEtOTkwNGI4ZmNkOWVkXkEyXkFqcGc@._V1_FMjpg_UY2362_.jpg",
    "trailer": "https://www.youtube.com/watch?v=ioUE_5wpg_E",
    "year": 2002,
    "genres": [
      "Crime",
      "Drama"
    ],
    "director": "Fernando Meirelles",
    "actors": [
      "Alexandre Rodrigues",
      "Leandro Firmino",
      "Phellipe Haagensen"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0317248",
    "watchUrl": "https://www.themoviedb.org/movie/598/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0266543",
    "title": "Finding Nemo",
    "poster": "https://m.media-amazon.com/images/M/MV5BMTc5NjExNTA5OV5BMl5BanBnXkFtZTYwMTQ0ODY2._V1_FMjpg_UX485_.jpg",
    "trailer": "https://www.youtube.com/watch?v=9oQ628Seb9w",
    "year": 2003,
    "genres": [
      "Animation",
      "Adventure",
      "Family"
    ],
    "director": "Andrew Stanton",
    "actors": [
      "Albert Brooks",
      "Ellen DeGeneres",
      "Alexander Gould"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0266543",
    "watchUrl": "https://www.themoviedb.org/movie/12/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0477348",
    "title": "No Country for Old Men",
    "poster": "https://m.media-amazon.com/images/M/MV5BMjA5Njk3MjM4OV5BMl5BanBnXkFtZTcwMTc5MTE1MQ@@._V1_FMjpg_UX555_.jpg",
    "trailer": "https://www.youtube.com/watch?v=38A__WT3-o0",
    "year": 2007,
    "genres": [
      "Crime",
      "Drama",
      "Thriller"
    ],
    "director": "Ethan Coen & Joel Coen",
    "actors": [
      "Javier Bardem",
      "Josh Brolin",
      "Tommy Lee Jones"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0477348",
    "watchUrl": "https://www.themoviedb.org/movie/6977/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0352248",
    "title": "Cinderella Man",
    "poster": "https://m.media-amazon.com/images/M/MV5BYjQ3M2ZjMzYtNmQwNC00MjNkLTgzOTgtMjhjMDk0YzIzOWZkXkEyXkFqcGc@._V1_FMjpg_UY2260_.jpg",
    "trailer": "https://www.youtube.com/watch?v=PpdRWplFjG8",
    "year": 2005,
    "genres": [
      "Biography",
      "Drama",
      "Sport"
    ],
    "director": "Ron Howard",
    "actors": [
      "Russell Crowe",
      "Renée Zellweger",
      "Paul Giamatti"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0352248",
    "watchUrl": "https://www.themoviedb.org/movie/921/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0434409",
    "title": "V for Vendetta",
    "poster": "https://m.media-amazon.com/images/M/MV5BOTI5ODc3NzExNV5BMl5BanBnXkFtZTcwNzYxNzQzMw@@._V1_FMjpg_UY2048_.jpg",
    "trailer": "https://www.youtube.com/watch?v=lSA7mAHolAw",
    "year": 2005,
    "genres": [
      "Action",
      "Drama",
      "Sci-Fi",
      "Dystopian"
    ],
    "director": "James McTeigue",
    "actors": [
      "Natalie Portman",
      "Hugo Weaving",
      "Stephen Rea"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0434409",
    "watchUrl": "https://www.themoviedb.org/movie/752/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0469494",
    "title": "There Will Be Blood",
    "poster": "https://m.media-amazon.com/images/M/MV5BMjAxODQ4MDU5NV5BMl5BanBnXkFtZTcwMDU4MjU1MQ@@._V1_FMjpg_UX510_.jpg",
    "trailer": "https://www.youtube.com/watch?v=FeSLPELpMeM",
    "year": 2007,
    "genres": [
      "Drama",
      "History"
    ],
    "director": "Paul Thomas Anderson",
    "actors": [
      "Daniel Day-Lewis",
      "Paul Dano",
      "Ciarán Hinds"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0469494",
    "watchUrl": "https://www.themoviedb.org/movie/7345/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0246578",
    "title": "Donnie Darko",
    "poster": "https://m.media-amazon.com/images/M/MV5BMWE3NTYzZmEtM2U5MS00MDZhLTk2ZTQtZTgzNjg0ZGQ5ZjM0XkEyXkFqcGc@._V1_FMjpg_UX666_.jpg",
    "trailer": "https://www.youtube.com/watch?v=bzLn8sYeM9o",
    "year": 2001,
    "genres": [
      "Sci-Fi",
      "Mystery",
      "Drama"
    ],
    "director": "Richard Kelly",
    "actors": [
      "Jake Gyllenhaal",
      "Jena Malone",
      "Patrick Swayze"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0246578",
    "watchUrl": "https://www.themoviedb.org/movie/141/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0401792",
    "title": "Sin City",
    "poster": "https://m.media-amazon.com/images/M/MV5BNWE2YmYyYzQtNGMwMi00Yzk0LTk3ZTYtYTcxNmFjMDE1MGExXkEyXkFqcGc@._V1_FMjpg_UX1020_.jpg",
    "trailer": "https://www.youtube.com/watch?v=T2Dj6ktPU5c",
    "year": 2005,
    "genres": [
      "Crime",
      "Thriller",
      "Neo-Noir"
    ],
    "director": "Frank Miller & Robert Rodriguez",
    "actors": [
      "Mickey Rourke",
      "Clive Owen",
      "Jessica Alba"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0401792",
    "watchUrl": "https://www.themoviedb.org/movie/187/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0327056",
    "title": "Mystic River",
    "poster": "https://m.media-amazon.com/images/M/MV5BMTIzNDUyMjA4MV5BMl5BanBnXkFtZTYwNDc4ODM3._V1_FMjpg_UX485_.jpg",
    "trailer": "https://www.youtube.com/watch?v=W7NktJhrRYQ",
    "year": 2003,
    "genres": [
      "Crime",
      "Drama",
      "Mystery"
    ],
    "director": "Clint Eastwood",
    "actors": [
      "Sean Penn",
      "Tim Robbins",
      "Kevin Bacon"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0327056",
    "watchUrl": "https://www.themoviedb.org/movie/322/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0416449",
    "title": "300",
    "poster": "https://m.media-amazon.com/images/M/MV5BMjc4OTc0ODgwNV5BMl5BanBnXkFtZTcwNjM1ODE0MQ@@._V1_FMjpg_UY2880_.jpg",
    "trailer": "https://www.youtube.com/watch?v=UrIbxk7idYA",
    "year": 2006,
    "genres": [
      "Action",
      "War",
      "Fantasy"
    ],
    "director": "Zack Snyder",
    "actors": [
      "Gerard Butler",
      "Lena Headey",
      "David Wenham"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0416449",
    "watchUrl": "https://www.themoviedb.org/movie/1271/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt1139797",
    "title": "Let the Right One In",
    "poster": "https://m.media-amazon.com/images/M/MV5BYWY0ZWJlOTktZDFjNC00MmM5LTk5ZTctNzA0NzMwYmRhZTcyXkEyXkFqcGc@._V1_FMjpg_UX730_.jpg",
    "trailer": "https://www.youtube.com/watch?v=ICp4g9p_rgo",
    "year": 2008,
    "genres": [
      "Horror",
      "Romance",
      "Drama"
    ],
    "director": "Tomas Alfredson",
    "actors": [
      "Kåre Hedebrant",
      "Lina Leandersson",
      "Per Ragnar"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt1139797",
    "watchUrl": "https://www.themoviedb.org/movie/13310/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0268978",
    "title": "A Beautiful Mind",
    "poster": "https://m.media-amazon.com/images/M/MV5BNzljZTk5ZDgtZTQ1Zi00NTM4LThlOGUtZDk2MGM4NDQ4NWQyXkEyXkFqcGc@._V1_FMjpg_UX1010_.jpg",
    "trailer": "https://www.youtube.com/watch?v=YWwAOutgWBQ",
    "year": 2001,
    "genres": [
      "Biography",
      "Drama"
    ],
    "director": "Ron Howard",
    "actors": [
      "Russell Crowe",
      "Jennifer Connelly",
      "Ed Harris"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0268978",
    "watchUrl": "https://www.themoviedb.org/movie/453/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0408306",
    "title": "Munich",
    "poster": "https://m.media-amazon.com/images/M/MV5BMTcwNzYzMzMwMF5BMl5BanBnXkFtZTcwMzMzODczMQ@@._V1_FMjpg_UX972_.jpg",
    "trailer": "https://www.youtube.com/watch?v=feIjYUEWVxk",
    "year": 2005,
    "genres": [
      "Drama",
      "History",
      "Thriller"
    ],
    "director": "Steven Spielberg",
    "actors": [
      "Eric Bana",
      "Daniel Craig",
      "Ciarán Hinds"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0408306",
    "watchUrl": "https://www.themoviedb.org/movie/612/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt1049413",
    "title": "Up",
    "poster": "https://m.media-amazon.com/images/M/MV5BNmI1ZTc5MWMtMDYyOS00ZDc2LTkzOTAtNjQ4NWIxNjYyNDgzXkEyXkFqcGc@._V1_FMjpg_UX509_.jpg",
    "trailer": "https://www.youtube.com/watch?v=ORFWdXl_zJ4",
    "year": 2009,
    "genres": [
      "Animation",
      "Adventure",
      "Comedy",
      "Family"
    ],
    "director": "Pete Docter",
    "actors": [
      "Edward Asner",
      "Jordan Nagai",
      "Christopher Plummer"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt1049413",
    "watchUrl": "https://www.themoviedb.org/movie/14160/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0209144",
    "title": "Memento",
    "poster": "https://m.media-amazon.com/images/M/MV5BYmQ3MjliNjAtNWFiZS00YWI1LTlmZTktMzBiNDE1NjRhZjU0XkEyXkFqcGc@._V1_FMjpg_UX1022_.jpg",
    "trailer": "https://www.youtube.com/watch?v=0vS0E9bBSL0",
    "year": 2000,
    "genres": [
      "Mystery",
      "Thriller"
    ],
    "director": "Christopher Nolan",
    "actors": [
      "Guy Pearce",
      "Carrie-Anne Moss",
      "Joe Pantoliano"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0209144",
    "watchUrl": "https://www.themoviedb.org/movie/77/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0167261",
    "title": "The Lord of the Rings: The Two Towers",
    "poster": "https://m.media-amazon.com/images/M/MV5BMGQxMDdiOWUtYjc1Ni00YzM1LWE2NjMtZTg3Y2JkMjEzMTJjXkEyXkFqcGc@._V1_FMjpg_UX964_.jpg",
    "trailer": "https://www.youtube.com/watch?v=LbfMDwc4azU",
    "year": 2002,
    "genres": [
      "Fantasy",
      "Adventure",
      "Drama",
      "Epic"
    ],
    "director": "Peter Jackson",
    "actors": [
      "Elijah Wood",
      "Viggo Mortensen",
      "Ian McKellen"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0167261",
    "watchUrl": "https://www.themoviedb.org/movie/121/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0482571",
    "title": "The Prestige",
    "poster": "https://m.media-amazon.com/images/M/MV5BMTM3MzQ5MjQ5OF5BMl5BanBnXkFtZTcwMTQ3NzMzMw@@._V1_FMjpg_UY2048_.jpg",
    "trailer": "https://www.youtube.com/watch?v=o4gHCmTQDVI",
    "year": 2006,
    "genres": [
      "Drama",
      "Mystery",
      "Thriller"
    ],
    "director": "Christopher Nolan",
    "actors": [
      "Christian Bale",
      "Hugh Jackman",
      "Scarlett Johansson"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0482571",
    "watchUrl": "https://www.themoviedb.org/movie/1124/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt90020025",
    "title": "WALL·E",
    "poster": "https://m.media-amazon.com/images/M/MV5BMjExMTg5OTU0NF5BMl5BanBnXkFtZTcwMjMxMzMzMw@@._V1_FMjpg_UY2048_.jpg",
    "trailer": "https://www.youtube.com/watch?v=CZ1CATNbXg0",
    "year": 2008,
    "genres": [
      "Animation",
      "Adventure",
      "Family",
      "Sci-Fi"
    ],
    "director": "Andrew Stanton",
    "actors": [
      "Ben Burtt",
      "Elissa Knight",
      "Jeff Garlin"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90020025",
    "watchUrl": "https://www.justwatch.com/us/search?q=WALL%C2%B7E"
  },
  {
    "tt": "tt90020026",
    "title": "Requiem for a Dream",
    "poster": "https://m.media-amazon.com/images/M/MV5BN2ZlMjIzZjctYzA2My00ZWYyLWI4ZjctMGI2NWYyNzFiZjAwXkEyXkFqcGc@._V1_FMjpg_UY1920_.jpg",
    "trailer": "https://www.youtube.com/watch?v=0nU7dC9bIDg",
    "year": 2000,
    "genres": [
      "Drama",
      "Psychological"
    ],
    "director": "Darren Aronofsky",
    "actors": [
      "Ellen Burstyn",
      "Jared Leto",
      "Jennifer Connelly"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90020026",
    "watchUrl": "https://www.justwatch.com/us/search?q=Requiem%20for%20a%20Dream"
  },
  {
    "tt": "tt90020027",
    "title": "Into the Wild",
    "poster": "https://m.media-amazon.com/images/M/MV5BNTgwZTJhNWMtNzVjMy00YzQzLWI4MTAtYmJhOGQ5ZmQ3MDM0XkEyXkFqcGc@._V1_FMjpg_UY4869_.jpg",
    "trailer": "https://www.youtube.com/watch?v=g7ArZ7VD-QQ",
    "year": 2007,
    "genres": [
      "Adventure",
      "Biography",
      "Drama"
    ],
    "director": "Sean Penn",
    "actors": [
      "Emile Hirsch",
      "Marcia Gay Harden",
      "William Hurt"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90020027",
    "watchUrl": "https://www.justwatch.com/us/search?q=Into%20the%20Wild"
  },
  {
    "tt": "tt90020028",
    "title": "The Pianist",
    "poster": "https://m.media-amazon.com/images/M/MV5BMjEwNmEwYjgtNTk3ZC00NjljLTg5ZDctZTY3ZGQwZjRkZmQxXkEyXkFqcGc@._V1_FMjpg_UX787_.jpg",
    "trailer": "https://www.youtube.com/watch?v=u_jE7-6Uv7E",
    "year": 2002,
    "genres": [
      "Biography",
      "Drama",
      "Music",
      "War"
    ],
    "director": "Roman Polanski",
    "actors": [
      "Adrien Brody",
      "Thomas Kretschmann",
      "Frank Finlay"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90020028",
    "watchUrl": "https://www.justwatch.com/us/search?q=The%20Pianist"
  },
  {
    "tt": "tt90020029",
    "title": "Inglourious Basterds",
    "poster": "https://m.media-amazon.com/images/M/MV5BODZhMWJlNjYtNDExNC00MTIzLTllM2ItOGQ2NGVjNDQ3MzkzXkEyXkFqcGc@._V1_FMjpg_UY3000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=KnrRy6kSFF0",
    "year": 2009,
    "genres": [
      "Adventure",
      "Drama",
      "War"
    ],
    "director": "Quentin Tarantino",
    "actors": [
      "Brad Pitt",
      "Christoph Waltz",
      "Mélanie Laurent"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90020029",
    "watchUrl": "https://www.justwatch.com/us/search?q=Inglourious%20Basterds"
  },
  {
    "tt": "tt90020030",
    "title": "The Lord of the Rings: The Fellowship of the Ring",
    "poster": "https://m.media-amazon.com/images/M/MV5BNzIxMDQ2YTctNDY4MC00ZTRhLTk4ODQtMTVlOWY4NTdiYmMwXkEyXkFqcGc@._V1_FMjpg_UY2936_.jpg",
    "trailer": "https://www.youtube.com/watch?v=V75dMMIW2B4",
    "year": 2001,
    "genres": [
      "Adventure",
      "Drama",
      "Fantasy"
    ],
    "director": "Peter Jackson",
    "actors": [
      "Elijah Wood",
      "Ian McKellen",
      "Orlando Bloom"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90020030",
    "watchUrl": "https://www.justwatch.com/us/search?q=The%20Lord%20of%20the%20Rings%3A%20The%20Fellowship%20of%20the%20Ring"
  },
  {
    "tt": "tt90020031",
    "title": "Lost in Translation",
    "poster": "https://m.media-amazon.com/images/M/MV5BMTUxMzk0NDg1MV5BMl5BanBnXkFtZTgwNDg0NjkxMDI@._V1_FMjpg_UY3052_.jpg",
    "trailer": "https://www.youtube.com/watch?v=W6iVPCRflQM",
    "year": 2003,
    "genres": [
      "Comedy",
      "Drama",
      "Romance"
    ],
    "director": "Sofia Coppola",
    "actors": [
      "Bill Murray",
      "Scarlett Johansson",
      "Giovanni Ribisi"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90020031",
    "watchUrl": "https://www.justwatch.com/us/search?q=Lost%20in%20Translation"
  },
  {
    "tt": "tt90020032",
    "title": "The Hurt Locker",
    "poster": "https://m.media-amazon.com/images/M/MV5BMjcxOGFjMWMtMjE4MS00NjNiLTlkNGQtZTllMWFhZWNlMTNjXkEyXkFqcGc@._V1_FMjpg_UY2000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=M6mJFSjRAEI",
    "year": 2008,
    "genres": [
      "Drama",
      "Thriller",
      "War"
    ],
    "director": "Kathryn Bigelow",
    "actors": [
      "Jeremy Renner",
      "Anthony Mackie",
      "Brian Geraghtyn"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90020032",
    "watchUrl": "https://www.justwatch.com/us/search?q=The%20Hurt%20Locker"
  },
  {
    "tt": "tt90020033",
    "title": "Eternal Sunshine of the Spotless Mind",
    "poster": "https://m.media-amazon.com/images/M/MV5BMTY4NzcwODg3Nl5BMl5BanBnXkFtZTcwNTEwOTMyMw@@._V1_FMjpg_UY2048_.jpg",
    "trailer": "https://www.youtube.com/watch?v=yE-f1alkq9I",
    "year": 2004,
    "genres": [
      "Drama",
      "Romance",
      "Sci-Fi"
    ],
    "director": "Michel Gondry",
    "actors": [
      "Jim Carrey",
      "Kate Winslet",
      "Kirsten Dunst"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90020033",
    "watchUrl": "https://www.justwatch.com/us/search?q=Eternal%20Sunshine%20of%20the%20Spotless%20Mind"
  },
  {
    "tt": "tt90020034",
    "title": "Crouching Tiger, Hidden Dragon",
    "poster": "https://m.media-amazon.com/images/M/MV5BMzRmMTU2OWEtZjI0Ni00MGRhLThjOTItZTJiNmM4MDk0ZWU2XkEyXkFqcGc@._V1_FMjpg_UY2947_.jpg",
    "trailer": "https://www.youtube.com/watch?v=WdhvxJZDqzU",
    "year": 2000,
    "genres": [
      "Action",
      "Adventure",
      "Drama",
      "Fantasy",
      "Romance"
    ],
    "director": "Ang Lee",
    "actors": [
      "Chow Yun-Fat",
      "Michelle Yeoh",
      "Ziyi Zhang"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90020034",
    "watchUrl": "https://www.justwatch.com/us/search?q=Crouching%20Tiger%2C%20Hidden%20Dragon"
  },
  {
    "tt": "tt90020035",
    "title": "American Psycho",
    "poster": "https://m.media-amazon.com/images/M/MV5BYzIxMmI2NmMtODNmZi00YTc2LWI0ZjUtNjMwMjcwYjdjMWRlXkEyXkFqcGc@._V1_FMjpg_UX886_.jpg",
    "trailer": "https://www.youtube.com/watch?v=2GIsExb5jJU",
    "year": 2000,
    "genres": [
      "Crime",
      "Drama",
      "Horror",
      "Thriller"
    ],
    "director": "Mary Harron",
    "actors": [
      "Christian Bale",
      "Willem Dafoe",
      "Jared Leto"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90020035",
    "watchUrl": "https://www.justwatch.com/us/search?q=American%20Psycho"
  },
  {
    "tt": "tt90020036",
    "title": "Kill Bill: Vol. 1",
    "poster": "https://m.media-amazon.com/images/M/MV5BNmQyZTMwNTMtM2U0Yy00YTM4LWJmZTgtZWIyYzdjODY4NGY4XkEyXkFqcGc@._V1_FMjpg_UY3000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=7kSuas6mRpk",
    "year": 2003,
    "genres": [
      "Action",
      "Crime",
      "Drama",
      "Thriller"
    ],
    "director": "Quentin Tarantino",
    "actors": [
      "Uma Thurman",
      "Lucy Liu",
      "Vivica A. Fox"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90020036",
    "watchUrl": "https://www.justwatch.com/us/search?q=Kill%20Bill%3A%20Vol.%201"
  },
  {
    "tt": "tt90020037",
    "title": "Road to Perdition",
    "poster": "https://m.media-amazon.com/images/M/MV5BMjMyYjMyMzktMjlhZC00ZTZkLTkzMWQtZmEwMjdjNzJkM2RlXkEyXkFqcGc@._V1_FMjpg_UX1013_.jpg",
    "trailer": "https://www.youtube.com/watch?v=OreveBlLfho",
    "year": 2002,
    "genres": [
      "Crime",
      "Drama",
      "Thriller"
    ],
    "director": "Sam Mendes",
    "actors": [
      "Tom Hanks",
      "Paul Newman",
      "Jude Law"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90020037",
    "watchUrl": "https://www.justwatch.com/us/search?q=Road%20to%20Perdition"
  },
  {
    "tt": "tt90020038",
    "title": "Walk the Line",
    "poster": "https://m.media-amazon.com/images/M/MV5BMjIyOTU3MjUxOF5BMl5BanBnXkFtZTcwMTQ0NjYzMw@@._V1_FMjpg_UY2048_.jpg",
    "trailer": "https://www.youtube.com/watch?v=6-oNSs_XMxI",
    "year": 2005,
    "genres": [
      "Biography",
      "Drama",
      "Music",
      "Romance"
    ],
    "director": "James Mangold",
    "actors": [
      "Joaquin Phoenix",
      "Reese Witherspoon",
      "Ginnifer Goodwin"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90020038",
    "watchUrl": "https://www.justwatch.com/us/search?q=Walk%20the%20Line"
  },
  {
    "tt": "tt90020039",
    "title": "The Last Samurai",
    "poster": "https://m.media-amazon.com/images/M/MV5BMzkyNzQ1Mzc0NV5BMl5BanBnXkFtZTcwODg3MzUzMw@@._V1_FMjpg_UY2048_.jpg",
    "trailer": "https://www.youtube.com/watch?v=T50_qHEOahQ",
    "year": 2003,
    "genres": [
      "Action",
      "Drama",
      "History",
      "War"
    ],
    "director": "Edward Zwick",
    "actors": [
      "Tom Cruise",
      "Ken Watanabe",
      "Billy Connolly"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90020039",
    "watchUrl": "https://www.justwatch.com/us/search?q=The%20Last%20Samurai"
  },
  {
    "tt": "tt90020040",
    "title": "Million Dollar Baby",
    "poster": "https://m.media-amazon.com/images/M/MV5BNzkzNDIyNjIzNV5BMl5BanBnXkFtZTYwMzQwNTg2._V1_FMjpg_UX485_.jpg",
    "trailer": "https://www.youtube.com/watch?v=5_RsHRmIRBY",
    "year": 2004,
    "genres": [
      "Drama",
      "Sport"
    ],
    "director": "Clint Eastwood",
    "actors": [
      "Hilary Swank",
      "Clint Eastwood",
      "Morgan Freeman"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90020040",
    "watchUrl": "https://www.justwatch.com/us/search?q=Million%20Dollar%20Baby"
  },
  {
    "tt": "tt90020041",
    "title": "O Brother, Where Art Thou?",
    "poster": "https://m.media-amazon.com/images/M/MV5BMDhmMzZkYzctOTQ4MS00NWEzLWI1YzMtNTllZDhkYjgwOWQ0XkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=7UVP8qCVYQE",
    "year": 2000,
    "genres": [
      "Adventure",
      "Comedy",
      "Crime",
      "Music"
    ],
    "director": "Joel Coen & Ethan Coen",
    "actors": [
      "George Clooney",
      "John Turturro",
      "Tim Blake Nelson"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90020041",
    "watchUrl": "https://www.justwatch.com/us/search?q=O%20Brother%2C%20Where%20Art%20Thou%3F"
  },
  {
    "tt": "tt90020042",
    "title": "Downfall",
    "poster": "https://m.media-amazon.com/images/M/MV5BMTU0NTU5NTAyMl5BMl5BanBnXkFtZTYwNzYwMDg2._V1_FMjpg_UX477_.jpg",
    "trailer": "https://www.youtube.com/watch?v=Bp1RXmM1-60",
    "year": 2004,
    "genres": [
      "Biography",
      "Drama",
      "History",
      "War"
    ],
    "director": "Oliver Hirschbiegel",
    "actors": [
      "Bruno Ganz",
      "Alexandra Maria Lara",
      "Ulrich Matthes"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90020042",
    "watchUrl": "https://www.justwatch.com/us/search?q=Downfall"
  },
  {
    "tt": "tt90020043",
    "title": "Black Hawk Down",
    "poster": "https://m.media-amazon.com/images/M/MV5BYTM3YTQ1M2MtNDEyNC00NzRlLWFmOTgtYjBhNDg2ODNjNTU0XkEyXkFqcGc@._V1_FMjpg_UY3000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=rBRKWpomhtQ",
    "year": 2001,
    "genres": [
      "Drama",
      "History",
      "War"
    ],
    "director": "Ridley Scott",
    "actors": [
      "Josh Hartnett",
      "Ewan McGregor",
      "Tom Sizemore"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90020043",
    "watchUrl": "https://www.justwatch.com/us/search?q=Black%20Hawk%20Down"
  },
  {
    "tt": "tt90020044",
    "title": "Hotel Rwanda",
    "poster": "https://m.media-amazon.com/images/M/MV5BY2FmMWRmZmQtN2IzMS00OGVmLWFmNjktMTM0YWQzODcwYTEwXkEyXkFqcGc@._V1_FMjpg_UX1174_.jpg",
    "trailer": "https://www.youtube.com/watch?v=qZzfxL90100",
    "year": 2004,
    "genres": [
      "Biography",
      "Drama",
      "History",
      "War"
    ],
    "director": "Terry George",
    "actors": [
      "Don Cheadle",
      "Sophie Okonedo",
      "Joaquin Phoenix"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90020044",
    "watchUrl": "https://www.justwatch.com/us/search?q=Hotel%20Rwanda"
  },
  {
    "tt": "tt90020045",
    "title": "The Curious Case of Benjamin Button",
    "poster": "https://m.media-amazon.com/images/M/MV5BYjIyNDExOWItM2Y4ZC00NmY3LWFlN2ItYTJlZDQ1NTJlZTUwXkEyXkFqcGc@._V1_FMjpg_UY1896_.jpg",
    "trailer": "https://www.youtube.com/watch?v=iH6FdW39Hag",
    "year": 2008,
    "genres": [
      "Drama",
      "Fantasy",
      "Romance"
    ],
    "director": "David Fincher",
    "actors": [
      "Brad Pitt",
      "Cate Blanchett",
      "Taraji P. Henson"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90020045",
    "watchUrl": "https://www.justwatch.com/us/search?q=The%20Curious%20Case%20of%20Benjamin%20Button"
  },
  {
    "tt": "tt90020046",
    "title": "Eastern Promises",
    "poster": "https://m.media-amazon.com/images/M/MV5BMTcwMzU0OTY3NF5BMl5BanBnXkFtZTYwNzkwNjg2._V1_FMjpg_UX450_.jpg",
    "trailer": "https://www.youtube.com/watch?v=ifilHp3_dWQ",
    "year": 2007,
    "genres": [
      "Crime",
      "Drama",
      "Thriller"
    ],
    "director": "David Cronenberg",
    "actors": [
      "Viggo Mortensen",
      "Naomi Watts",
      "Vincent Cassel"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90020046",
    "watchUrl": "https://www.justwatch.com/us/search?q=Eastern%20Promises"
  },
  {
    "tt": "tt90020047",
    "title": "Little Miss Sunshine",
    "poster": "https://m.media-amazon.com/images/M/MV5BMTgzNTgzODU0NV5BMl5BanBnXkFtZTcwMjEyMjMzMQ@@._V1_FMjpg_UY3000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=wvwVkllXT80",
    "year": 2006,
    "genres": [
      "Comedy",
      "Drama"
    ],
    "director": "Jonathan Dayton & Valerie Faris",
    "actors": [
      "Greg Kinnear",
      "Toni Collette",
      "Steve Carell"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90020047",
    "watchUrl": "https://www.justwatch.com/us/search?q=Little%20Miss%20Sunshine"
  },
  {
    "tt": "tt90020048",
    "title": "The Incredibles",
    "poster": "https://m.media-amazon.com/images/M/MV5BMTY5OTU0OTc2NV5BMl5BanBnXkFtZTcwMzU4MDcyMQ@@._V1_FMjpg_UY2666_.jpg",
    "trailer": "https://www.youtube.com/watch?v=-UaGUdNJdRQ",
    "year": 2004,
    "genres": [
      "Animation",
      "Action",
      "Adventure",
      "Family"
    ],
    "director": "Brad Bird",
    "actors": [
      "Craig T. Nelson",
      "Holly Hunter",
      "Samuel L. Jackson"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90020048",
    "watchUrl": "https://www.justwatch.com/us/search?q=The%20Incredibles"
  }
];

const SEED_LIST_4 = [
  {
    "tt": "tt0110912",
    "title": "Pulp Fiction",
    "poster": "https://m.media-amazon.com/images/M/MV5BYTViYTE3ZGQtNDBlMC00ZTAyLTkyODMtZGRiZDg0MjA2YThkXkEyXkFqcGc@._V1_FMjpg_UX1055_.jpg",
    "trailer": "https://www.youtube.com/watch?v=s7EdQ4FqbhY",
    "year": 1994,
    "genres": [
      "Crime",
      "Drama"
    ],
    "director": "Quentin Tarantino",
    "actors": [
      "John Travolta",
      "Uma Thurman",
      "Samuel L. Jackson"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0110912",
    "watchUrl": "https://www.themoviedb.org/movie/680/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0099685",
    "title": "Goodfellas",
    "poster": "https://m.media-amazon.com/images/M/MV5BN2E5NzI2ZGMtY2VjNi00YTRjLWI1MDUtZGY5OWU1MWJjZjRjXkEyXkFqcGc@._V1_FMjpg_UY2972_.jpg",
    "trailer": "https://www.youtube.com/watch?v=2ilzidi_J8Q",
    "year": 1990,
    "genres": [
      "Biography",
      "Crime",
      "Drama"
    ],
    "director": "Martin Scorsese",
    "actors": [
      "Ray Liotta",
      "Robert De Niro",
      "Joe Pesci"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0099685",
    "watchUrl": "https://www.themoviedb.org/movie/769/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0116282",
    "title": "Fargo",
    "poster": "https://m.media-amazon.com/images/M/MV5BNjg4MWE0MjEtODFhNy00MjA5LTg5ODktMzgwNWFmZTAwNjBlXkEyXkFqcGc@._V1_FMjpg_UY1938_.jpg",
    "trailer": "https://www.youtube.com/watch?v=h2tY82z3xXU",
    "year": 1996,
    "genres": [
      "Crime",
      "Drama",
      "Thriller",
      "Dark Comedy"
    ],
    "director": "Ethan Coen & Joel Coen",
    "actors": [
      "Frances McDormand",
      "William H. Macy",
      "Steve Buscemi"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0116282",
    "watchUrl": "https://www.themoviedb.org/movie/275/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0119488",
    "title": "L.A. Confidential",
    "poster": "https://m.media-amazon.com/images/M/MV5BMjY2NjQxYjktYzc0MC00MmIxLTg2ZTctZmU1MjhiZDk2MTg5XkEyXkFqcGc@._V1_FMjpg_UY2938_.jpg",
    "trailer": "https://www.youtube.com/watch?v=6sOXrY5yV4g",
    "year": 1997,
    "genres": [
      "Crime",
      "Drama",
      "Mystery",
      "Neo-noir"
    ],
    "director": "Curtis Hanson",
    "actors": [
      "Kevin Spacey",
      "Russell Crowe",
      "Guy Pearce"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0119488",
    "watchUrl": "https://www.themoviedb.org/movie/2118/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0118715",
    "title": "The Big Lebowski",
    "poster": "https://m.media-amazon.com/images/M/MV5BMjc2YjRlMWMtYzlhYS00ZDI5LTkwY2QtNzA4NjYzMTMwY2JjXkEyXkFqcGc@._V1_FMjpg_UY3156_.jpg",
    "trailer": "https://www.youtube.com/watch?v=cd-go0oBF4Y",
    "year": 1998,
    "genres": [
      "Comedy",
      "Crime"
    ],
    "director": "Ethan Coen & Joel Coen",
    "actors": [
      "Jeff Bridges",
      "John Goodman",
      "Julianne Moore"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0118715",
    "watchUrl": "https://www.themoviedb.org/movie/115/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0120815",
    "title": "Saving Private Ryan",
    "poster": "https://m.media-amazon.com/images/M/MV5BZGZhZGQ1ZWUtZTZjYS00MDJhLWFkYjctN2ZlYjE5NWYwZDM2XkEyXkFqcGc@._V1_FMjpg_UX800_.jpg",
    "trailer": "https://www.youtube.com/watch?v=9CiW_DgxCnQ",
    "year": 1998,
    "genres": [
      "Drama",
      "War"
    ],
    "director": "Steven Spielberg",
    "actors": [
      "Tom Hanks",
      "Matt Damon",
      "Tom Sizemore"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0120815",
    "watchUrl": "https://www.themoviedb.org/movie/857/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0137523",
    "title": "Fight Club",
    "poster": "https://m.media-amazon.com/images/M/MV5BOTgyOGQ1NDItNGU3Ny00MjU3LTg2YWEtNmEyYjBiMjI1Y2M5XkEyXkFqcGc@._V1_FMjpg_UX1066_.jpg",
    "trailer": "https://www.youtube.com/watch?v=SUXWAEX2jlg",
    "year": 1999,
    "genres": [
      "Drama",
      "Thriller"
    ],
    "director": "David Fincher",
    "actors": [
      "Brad Pitt",
      "Edward Norton",
      "Helena Bonham Carter"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0137523",
    "watchUrl": "https://www.themoviedb.org/movie/550/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0102926",
    "title": "The Silence of the Lambs",
    "poster": "https://m.media-amazon.com/images/M/MV5BNDdhOGJhYzctYzYwZC00YmI2LWI0MjctYjg4ODdlMDExYjBlXkEyXkFqcGc@._V1_FMjpg_UY2968_.jpg",
    "trailer": "https://www.youtube.com/watch?v=W6Mm8Sbe__o",
    "year": 1991,
    "genres": [
      "Crime",
      "Drama",
      "Thriller",
      "Horror"
    ],
    "director": "Jonathan Demme",
    "actors": [
      "Jodie Foster",
      "Anthony Hopkins",
      "Scott Glenn"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0102926",
    "watchUrl": "https://www.themoviedb.org/movie/274/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0175880",
    "title": "Magnolia",
    "poster": "https://m.media-amazon.com/images/M/MV5BOWY0Zjk1YTMtMGFlYi00OTFmLWEyOTAtNmRkYjE0ZDJiZWMwXkEyXkFqcGc@._V1_FMjpg_UY2771_.jpg",
    "trailer": "https://www.youtube.com/watch?v=zwXDHSrNFbQ",
    "year": 1999,
    "genres": [
      "Drama"
    ],
    "director": "Paul Thomas Anderson",
    "actors": [
      "Tom Cruise",
      "Philip Seymour Hoffman",
      "Julianne Moore"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0175880",
    "watchUrl": "https://www.themoviedb.org/movie/334/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0169547",
    "title": "American Beauty",
    "poster": "https://m.media-amazon.com/images/M/MV5BMDI1MDE0OTMtMmI2MS00Yjc2LTg2MTItMWExYTg5NzA1OGUzXkEyXkFqcGc@._V1_FMjpg_UX675_.jpg",
    "trailer": "https://www.youtube.com/watch?v=XCxzXblZyfQ",
    "year": 1999,
    "genres": [
      "Drama"
    ],
    "director": "Sam Mendes",
    "actors": [
      "Kevin Spacey",
      "Annette Bening",
      "Thora Birch"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0169547",
    "watchUrl": "https://www.themoviedb.org/movie/14/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0105695",
    "title": "Unforgiven",
    "poster": "https://m.media-amazon.com/images/M/MV5BNmZmMzM3YWMtZjg5Yi00M2MxLTg3ZGItNGU4YjQxNDAxM2Q4XkEyXkFqcGc@._V1_FMjpg_UY3155_.jpg",
    "trailer": "https://www.youtube.com/watch?v=ftTX4FoBWlE",
    "year": 1992,
    "genres": [
      "Western",
      "Drama"
    ],
    "director": "Clint Eastwood",
    "actors": [
      "Clint Eastwood",
      "Gene Hackman",
      "Morgan Freeman"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0105695",
    "watchUrl": "https://www.themoviedb.org/movie/33/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0114369",
    "title": "Se7en",
    "poster": "https://m.media-amazon.com/images/M/MV5BY2IzNzMxZjctZjUxZi00YzAxLTk3ZjMtODFjODdhMDU5NDM1XkEyXkFqcGc@._V1_FMjpg_UY2815_.jpg",
    "trailer": "https://www.youtube.com/watch?v=znmZoVkCjpI",
    "year": 1995,
    "genres": [
      "Crime",
      "Drama",
      "Mystery",
      "Thriller"
    ],
    "director": "David Fincher",
    "actors": [
      "Brad Pitt",
      "Morgan Freeman",
      "Kevin Spacey"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0114369",
    "watchUrl": "https://www.themoviedb.org/movie/807/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0111161",
    "title": "The Shawshank Redemption",
    "poster": "https://m.media-amazon.com/images/M/MV5BMGUwODNmMDYtZGY4NS00M2Q1LTgwY2ItMmEwY2UzMmY3MTM2XkEyXkFqcGc@._V1_FMjpg_UY3000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=6hB3S9bIaco",
    "year": 1994,
    "genres": [
      "Drama"
    ],
    "director": "Frank Darabont",
    "actors": [
      "Tim Robbins",
      "Morgan Freeman",
      "Bob Gunton"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0111161",
    "watchUrl": "https://www.themoviedb.org/movie/278/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0109830",
    "title": "Forrest Gump",
    "poster": "https://m.media-amazon.com/images/M/MV5BNDYwNzVjMTItZmU5YS00YjQ5LTljYjgtMjY2NDVmYWMyNWFmXkEyXkFqcGc@._V1_FMjpg_UX558_.jpg",
    "trailer": "https://www.youtube.com/watch?v=bLvqoHBptjg",
    "year": 1994,
    "genres": [
      "Drama",
      "Romance"
    ],
    "director": "Robert Zemeckis",
    "actors": [
      "Tom Hanks",
      "Robin Wright",
      "Gary Sinise"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0109830",
    "watchUrl": "https://www.themoviedb.org/movie/13/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0113277",
    "title": "Heat",
    "poster": "https://m.media-amazon.com/images/M/MV5BMTkxYjU1OTMtYWViZC00ZjAzLWI3MDktZGQ2N2VmMjVjNDRlXkEyXkFqcGc@._V1_FMjpg_UY2956_.jpg",
    "trailer": "https://www.youtube.com/watch?v=0xbBLJ1WGwQ",
    "year": 1995,
    "genres": [
      "Crime",
      "Drama",
      "Thriller"
    ],
    "director": "Michael Mann",
    "actors": [
      "Al Pacino",
      "Robert De Niro",
      "Val Kilmer"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0113277",
    "watchUrl": "https://www.themoviedb.org/movie/949/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0117666",
    "title": "Sling Blade",
    "poster": "https://m.media-amazon.com/images/M/MV5BNDM5MjhhMDgtMmVmYy00ODNlLWI1OGMtMzAzNmY5OGRmNjk0XkEyXkFqcGc@._V1_FMjpg_UY2165_.jpg",
    "trailer": "https://www.youtube.com/watch?v=-RLVfo4SZfg",
    "year": 1996,
    "genres": [
      "Drama"
    ],
    "director": "Billy Bob Thornton",
    "actors": [
      "Billy Bob Thornton",
      "Dwight Yoakam",
      "J.T. Walsh"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0117666",
    "watchUrl": "https://www.themoviedb.org/movie/12498/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0120780",
    "title": "Out of Sight",
    "poster": "https://m.media-amazon.com/images/M/MV5BM2U3OGQ0NTMtNmQxYS00MmRiLTg2OTctZDI3ZjNjZjM5N2NlXkEyXkFqcGc@._V1_FMjpg_UY2000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=ZmfG7YF_5MA",
    "year": 1998,
    "genres": [
      "Crime",
      "Comedy",
      "Romance"
    ],
    "director": "Steven Soderbergh",
    "actors": [
      "George Clooney",
      "Jennifer Lopez",
      "Ving Rhames"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0120780",
    "watchUrl": "https://www.themoviedb.org/movie/1389/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0106677",
    "title": "Dazed and Confused",
    "poster": "https://m.media-amazon.com/images/M/MV5BMTM5MDY5MDQyOV5BMl5BanBnXkFtZTgwMzM3NzMxMDE@._V1_FMjpg_UX675_.jpg",
    "trailer": "https://www.youtube.com/watch?v=3aQuvPlcB-8",
    "year": 1993,
    "genres": [
      "Comedy",
      "Drama"
    ],
    "director": "Richard Linklater",
    "actors": [
      "Jason London",
      "Rory Cochrane",
      "Matthew McConaughey"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0106677",
    "watchUrl": "https://www.themoviedb.org/movie/9571/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0120586",
    "title": "American History X",
    "poster": "https://m.media-amazon.com/images/M/MV5BMzhiOTQ0NDItOTg0Zi00OGVmLWE0OGEtMTI4NDM0NWMxZWU4XkEyXkFqcGc@._V1_FMjpg_UX960_.jpg",
    "trailer": "https://www.youtube.com/watch?v=XfQYHqsiN5g",
    "year": 1998,
    "genres": [
      "Drama",
      "Crime"
    ],
    "director": "Tony Kaye",
    "actors": [
      "Edward Norton",
      "Edward Furlong",
      "Beverly D’Angelo"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0120586",
    "watchUrl": "https://www.themoviedb.org/movie/73/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0120669",
    "title": "Election",
    "poster": "https://m.media-amazon.com/images/M/MV5BMTVmMWJiMTgtNmNmMS00NmI2LTgxZTAtNjdhODE2NTBlYTAyXkEyXkFqcGc@._V1_FMjpg_UX580_.jpg",
    "trailer": "https://www.youtube.com/watch?v=tBgM_Kw6PSM",
    "year": 1999,
    "genres": [
      "Comedy",
      "Drama"
    ],
    "director": "Alexander Payne",
    "actors": [
      "Matthew Broderick",
      "Reese Witherspoon",
      "Chris Klein"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0120669",
    "watchUrl": "https://www.themoviedb.org/movie/1878/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0100150",
    "title": "Miller's Crossing",
    "poster": "https://m.media-amazon.com/images/M/MV5BMTY2Njk3MTAzM15BMl5BanBnXkFtZTgwMTY5Mzk4NjE@._V1_FMjpg_UX1004_.jpg",
    "trailer": "https://www.youtube.com/watch?v=hkJIcFMN_pc",
    "year": 1990,
    "genres": [
      "Crime",
      "Drama",
      "Thriller"
    ],
    "director": "Ethan Coen & Joel Coen",
    "actors": [
      "Gabriel Byrne",
      "Albert Finney",
      "John Turturro"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0100150",
    "watchUrl": "https://www.themoviedb.org/movie/379/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0118749",
    "title": "Boogie Nights",
    "poster": "https://m.media-amazon.com/images/M/MV5BZmZjY2M5MjUtMmIzZi00NjI4LWE1NWUtYjMwMGJlMzVmN2EzXkEyXkFqcGc@._V1_FMjpg_UX680_.jpg",
    "trailer": "https://www.youtube.com/watch?v=pOk0fsMGyck",
    "year": 1997,
    "genres": [
      "Drama"
    ],
    "director": "Paul Thomas Anderson",
    "actors": [
      "Mark Wahlberg",
      "Julianne Moore",
      "Burt Reynolds"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0118749",
    "watchUrl": "https://www.themoviedb.org/movie/4995/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0107048",
    "title": "Groundhog Day",
    "poster": "https://m.media-amazon.com/images/M/MV5BOWE3MjQ3ZDAtNDQ2MC00YjBjLTk0ZWYtNjQ0YzQ4YWE3YTEyXkEyXkFqcGc@._V1_FMjpg_UY2530_.jpg",
    "trailer": "https://www.youtube.com/watch?v=tSVeDx9fk60",
    "year": 1993,
    "genres": [
      "Comedy",
      "Drama",
      "Fantasy",
      "Romance"
    ],
    "director": "Harold Ramis",
    "actors": [
      "Bill Murray",
      "Andie MacDowell",
      "Chris Elliott"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0107048",
    "watchUrl": "https://www.themoviedb.org/movie/137/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0108052",
    "title": "Schindler's List",
    "poster": "https://m.media-amazon.com/images/M/MV5BNjM1ZDQxYWUtMzQyZS00MTE1LWJmZGYtNGUyNTdlYjM3ZmVmXkEyXkFqcGc@._V1_FMjpg_UY2400_.jpg",
    "trailer": "https://www.youtube.com/watch?v=gG22XNhtnoY",
    "year": 1993,
    "genres": [
      "Biography",
      "Drama",
      "History",
      "War"
    ],
    "director": "Steven Spielberg",
    "actors": [
      "Liam Neeson",
      "Ben Kingsley",
      "Ralph Fiennes"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0108052",
    "watchUrl": "https://www.themoviedb.org/movie/424/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt90030025",
    "title": "Good Will Hunting",
    "poster": "https://m.media-amazon.com/images/M/MV5BYmI4ZWQ2MjYtNTY2OC00ZGE4LWEyMzItNjcyM2JmMmE2NTQ2XkEyXkFqcGc@._V1_FMjpg_UX826_.jpg",
    "trailer": "https://www.youtube.com/watch?v=PaZVjZEFkRs",
    "year": 1997,
    "genres": [
      "Drama",
      "Romance"
    ],
    "director": "Gus Van Sant",
    "actors": [
      "Matt Damon",
      "Robin Williams",
      "Ben Affleck"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90030025",
    "watchUrl": "https://www.justwatch.com/us/search?q=Good%20Will%20Hunting"
  },
  {
    "tt": "tt90030026",
    "title": "True Romance",
    "poster": "https://m.media-amazon.com/images/M/MV5BYzQ5OGMwMDAtMzcyOS00YTA4LWEwM2MtOTA1MDZjZGEyYmI1XkEyXkFqcGc@._V1_FMjpg_UY2966_.jpg",
    "trailer": "https://www.youtube.com/watch?v=_wNYNDzKpuQ",
    "year": 1993,
    "genres": [
      "Crime",
      "Drama",
      "Romance",
      "Thriller"
    ],
    "director": "Tony Scott",
    "actors": [
      "Christian Slater",
      "Patricia Arquette",
      "Dennis Hopper"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90030026",
    "watchUrl": "https://www.justwatch.com/us/search?q=True%20Romance"
  },
  {
    "tt": "tt90030027",
    "title": "The Usual Suspects",
    "poster": "https://m.media-amazon.com/images/M/MV5BYWVhOTM5MjgtY2M0MS00M2ZjLTgzOGQtZjA0NDgzMGY5YjkzXkEyXkFqcGc@._V1_FMjpg_UX736_.jpg",
    "trailer": "https://www.youtube.com/watch?v=oiXdPolca5w",
    "year": 1995,
    "genres": [
      "Crime",
      "Drama",
      "Mystery",
      "Thriller"
    ],
    "director": "Bryan Singer",
    "actors": [
      "Kevin Spacey",
      "Gabriel Byrne",
      "Chazz Palminteri"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90030027",
    "watchUrl": "https://www.justwatch.com/us/search?q=The%20Usual%20Suspects"
  },
  {
    "tt": "tt90030028",
    "title": "Being John Malkovich",
    "poster": "https://m.media-amazon.com/images/M/MV5BNDExODk1MTktNzRiYS00MWEyLTgyOWItYTI1OWY4NzI1NDM2XkEyXkFqcGc@._V1_FMjpg_UY2265_.jpg",
    "trailer": "https://www.youtube.com/watch?v=2UuRFr0GnHM",
    "year": 1999,
    "genres": [
      "Comedy",
      "Drama",
      "Fantasy"
    ],
    "director": "Spike Jonze",
    "actors": [
      "John Cusack",
      "Cameron Diaz",
      "Catherine Keener"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90030028",
    "watchUrl": "https://www.justwatch.com/us/search?q=Being%20John%20Malkovich"
  },
  {
    "tt": "tt90030029",
    "title": "Rushmore",
    "poster": "https://m.media-amazon.com/images/M/MV5BZmM2MTNhYWItMDc4Yi00MTM3LWI3YTctYjE1NWRjNTczYjI5XkEyXkFqcGc@._V1_FMjpg_UX1169_.jpg",
    "trailer": "https://www.youtube.com/watch?v=GxCNDpvGyss",
    "year": 1998,
    "genres": [
      "Comedy",
      "Drama",
      "Romance"
    ],
    "director": "Wes Anderson",
    "actors": [
      "Jason Schwartzman",
      "Bill Murray",
      "Olivia Williams"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90030029",
    "watchUrl": "https://www.justwatch.com/us/search?q=Rushmore"
  },
  {
    "tt": "tt90030030",
    "title": "Reservoir Dogs",
    "poster": "https://m.media-amazon.com/images/M/MV5BMmMzYjg4NDctYWY0Mi00OGViLWIzMTMtYWNlZGY5ZDJmYjk3XkEyXkFqcGc@._V1_FMjpg_UX667_.jpg",
    "trailer": "https://www.youtube.com/watch?v=vayksn4Y93A",
    "year": 1992,
    "genres": [
      "Crime",
      "Drama",
      "Thriller"
    ],
    "director": "Quentin Tarantino",
    "actors": [
      "Harvey Keitel",
      "Tim Roth",
      "Michael Madsen"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90030030",
    "watchUrl": "https://www.justwatch.com/us/search?q=Reservoir%20Dogs"
  },
  {
    "tt": "tt90030031",
    "title": "Braveheart",
    "poster": "https://m.media-amazon.com/images/M/MV5BNGMxZDBhNGQtYTZlNi00N2UzLWI4NDEtNmUzNWM2NTdmZDA0XkEyXkFqcGc@._V1_FMjpg_UY2924_.jpg",
    "trailer": "https://www.youtube.com/watch?v=1NJO0jxBtMo",
    "year": 1995,
    "genres": [
      "Biography",
      "Drama",
      "History",
      "War"
    ],
    "director": "Mel Gibson",
    "actors": [
      "Mel Gibson",
      "Sophie Marceau",
      "Patrick McGoohan"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90030031",
    "watchUrl": "https://www.justwatch.com/us/search?q=Braveheart"
  },
  {
    "tt": "tt90030032",
    "title": "JFK",
    "poster": "https://m.media-amazon.com/images/M/MV5BMDhhZTc0MWUtZmVjOS00YTNkLTk0YzgtNTNlNzY5ZWU4MTMyXkEyXkFqcGc@._V1_FMjpg_UX1018_.jpg",
    "trailer": "https://www.youtube.com/watch?v=w16bYZ-4nmE",
    "year": 1991,
    "genres": [
      "Drama",
      "History",
      "Thriller"
    ],
    "director": "Oliver Stone",
    "actors": [
      "Kevin Costner",
      "Kevin Bacon",
      "Tommy Lee Jones"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90030032",
    "watchUrl": "https://www.justwatch.com/us/search?q=JFK"
  },
  {
    "tt": "tt90030033",
    "title": "Ed Wood",
    "poster": "https://m.media-amazon.com/images/M/MV5BOWU4NzlkZGEtODNmYi00YTVhLWJhYjAtZjBkN2Q1Y2U5NjE4XkEyXkFqcGc@._V1_FMjpg_UX1013_.jpg",
    "trailer": "https://www.youtube.com/watch?v=CawVaHxWvnA",
    "year": 1994,
    "genres": [
      "Biography",
      "Comedy",
      "Drama"
    ],
    "director": "Tim Burton",
    "actors": [
      "Johnny Depp",
      "Martin Landau",
      "Sarah Jessica Parker"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90030033",
    "watchUrl": "https://www.justwatch.com/us/search?q=Ed%20Wood"
  },
  {
    "tt": "tt90030034",
    "title": "Waiting for Guffman",
    "poster": "https://m.media-amazon.com/images/M/MV5BMGY1MjZiOGEtNDE5Mi00N2EwLWI4OGMtYWZkNzJmYjI5ZWQwXkEyXkFqcGc@._V1_FMjpg_UX960_.jpg",
    "trailer": "https://www.youtube.com/watch?v=s0Ml4u3hLlY",
    "year": 1996,
    "genres": [
      "Comedy",
      "Music"
    ],
    "director": "Christopher Guest",
    "actors": [
      "Christopher Guest",
      "Eugene Levy",
      "Catherine O’Hara"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90030034",
    "watchUrl": "https://www.justwatch.com/us/search?q=Waiting%20for%20Guffman"
  },
  {
    "tt": "tt90030035",
    "title": "Dances with Wolves",
    "poster": "https://m.media-amazon.com/images/M/MV5BMTY3OTI5NDczN15BMl5BanBnXkFtZTcwNDA0NDY3Mw@@._V1_FMjpg_UX682_.jpg",
    "trailer": "https://www.youtube.com/watch?v=uc8NMbrW7mI",
    "year": 1990,
    "genres": [
      "Adventure",
      "Drama",
      "Western"
    ],
    "director": "Kevin Costner",
    "actors": [
      "Kevin Costner",
      "Mary McDonnell",
      "Graham Greene"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90030035",
    "watchUrl": "https://www.justwatch.com/us/search?q=Dances%20with%20Wolves"
  },
  {
    "tt": "tt90030036",
    "title": "Kingpin",
    "poster": "https://m.media-amazon.com/images/M/MV5BODAzODIyMDYwMV5BMl5BanBnXkFtZTcwMTUyNTEzNA@@._V1_FMjpg_UX682_.jpg",
    "trailer": "https://www.youtube.com/watch?v=XomVcCptGbQ",
    "year": 1996,
    "genres": [
      "Comedy",
      "Sport"
    ],
    "director": "Bobby Farrelly & Peter Farrelly",
    "actors": [
      "Woody Harrelson",
      "Randy Quaid",
      "Bill Murray"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90030036",
    "watchUrl": "https://www.justwatch.com/us/search?q=Kingpin"
  },
  {
    "tt": "tt90030037",
    "title": "Dumb and Dumber",
    "poster": "https://m.media-amazon.com/images/M/MV5BMjdmYTg3NGYtODFiYi00ZWI0LWE2NDAtZjhkMmJlNDA3MDZhXkEyXkFqcGc@._V1_FMjpg_UX570_.jpg",
    "trailer": "https://www.youtube.com/watch?v=l13yPhimE3o",
    "year": 1994,
    "genres": [
      "Comedy"
    ],
    "director": "Peter Farrelly & Bobby Farrelly",
    "actors": [
      "Jim Carrey",
      "Jeff Daniels",
      "Lauren Holly"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90030037",
    "watchUrl": "https://www.justwatch.com/us/search?q=Dumb%20and%20Dumber"
  },
  {
    "tt": "tt90030038",
    "title": "Clerks",
    "poster": "https://m.media-amazon.com/images/M/MV5BYzcwZTU5NzMtMGIxYi00NjRhLThkYTItNjhlYWQ0MjdhYWFmXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=Mlfn5n-E2WE",
    "year": 1994,
    "genres": [
      "Comedy",
      "Indie"
    ],
    "director": "Kevin Smith",
    "actors": [
      "Brian O’Halloran",
      "Jeff Anderson",
      "Marilyn Ghigliotti"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90030038",
    "watchUrl": "https://www.justwatch.com/us/search?q=Clerks"
  },
  {
    "tt": "tt90030039",
    "title": "Mallrats",
    "poster": "https://m.media-amazon.com/images/M/MV5BZDM2MWVkMWItNjhjMy00MDUzLWEyOTAtN2I0MzNlZjc4Mjk0XkEyXkFqcGc@._V1_FMjpg_UY2186_.jpg",
    "trailer": "https://www.youtube.com/watch?v=toFqw3d7TlA",
    "year": 1995,
    "genres": [
      "Comedy",
      "Romance"
    ],
    "director": "Kevin Smith",
    "actors": [
      "Shannen Doherty",
      "Jeremy London",
      "Jason Lee"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90030039",
    "watchUrl": "https://www.justwatch.com/us/search?q=Mallrats"
  },
  {
    "tt": "tt90030040",
    "title": "Jackie Brown",
    "poster": "https://m.media-amazon.com/images/M/MV5BZmUxZjY3MDktNGI5NS00MTQ5LWE0YWItZWQzNmZhNjhkZDYyXkEyXkFqcGc@._V1_FMjpg_UX1200_.jpg",
    "trailer": "https://www.youtube.com/watch?v=G7HkBDNZV7s",
    "year": 1997,
    "genres": [
      "Crime",
      "Drama",
      "Thriller"
    ],
    "director": "Quentin Tarantino",
    "actors": [
      "Pam Grier",
      "Samuel L. Jackson",
      "Robert Forster"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90030040",
    "watchUrl": "https://www.justwatch.com/us/search?q=Jackie%20Brown"
  },
  {
    "tt": "tt90030041",
    "title": "Boyz n the Hood",
    "poster": "https://m.media-amazon.com/images/M/MV5BOWVkMDEyMmQtMjZiMi00NmY1LTlmM2MtNTk0YWIyNGRkZGQ4XkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=sLgCCdLbQNc",
    "year": 1991,
    "genres": [
      "Crime",
      "Drama"
    ],
    "director": "John Singleton",
    "actors": [
      "Cuba Gooding Jr.",
      "Ice Cube",
      "Laurence Fishburne"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90030041",
    "watchUrl": "https://www.justwatch.com/us/search?q=Boyz%20n%20the%20Hood"
  },
  {
    "tt": "tt90030042",
    "title": "Get Shorty",
    "poster": "https://m.media-amazon.com/images/M/MV5BMjAwODYzNDY4Ml5BMl5BanBnXkFtZTcwODkwNTgzNA@@._V1_FMjpg_UX682_.jpg",
    "trailer": "https://www.youtube.com/watch?v=t2QcA-KoF5s",
    "year": 1995,
    "genres": [
      "Comedy",
      "Crime",
      "Thriller"
    ],
    "director": "Barry Sonnenfeld",
    "actors": [
      "John Travolta",
      "Gene Hackman",
      "Rene Russo"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90030042",
    "watchUrl": "https://www.justwatch.com/us/search?q=Get%20Shorty"
  },
  {
    "tt": "tt90030043",
    "title": "Jerry Maguire",
    "poster": "https://m.media-amazon.com/images/M/MV5BM2E1ZjU1MjctZjU2Yi00MGE1LWI1MDEtYzBlMWJlNDc1NTQxXkEyXkFqcGc@._V1_FMjpg_UY2922_.jpg",
    "trailer": "https://www.youtube.com/watch?v=KUd3gwaf0KQ",
    "year": 1996,
    "genres": [
      "Comedy",
      "Drama",
      "Romance",
      "Sport"
    ],
    "director": "Cameron Crowe",
    "actors": [
      "Tom Cruise",
      "Cuba Gooding Jr.",
      "Renée Zellweger"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90030043",
    "watchUrl": "https://www.justwatch.com/us/search?q=Jerry%20Maguire"
  },
  {
    "tt": "tt90030044",
    "title": "Bottle Rocket",
    "poster": "https://m.media-amazon.com/images/M/MV5BNDlmNWY5NmMtZDNiMS00YjQ1LTg5NmItZmE5ZWEwNDg2MzhjXkEyXkFqcGc@._V1_FMjpg_UY2925_.jpg",
    "trailer": "https://www.youtube.com/watch?v=JJPQ-NnjZR0",
    "year": 1996,
    "genres": [
      "Comedy",
      "Crime",
      "Drama",
      "Romance"
    ],
    "director": "Wes Anderson",
    "actors": [
      "Luke Wilson",
      "Owen Wilson",
      "James Caan"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90030044",
    "watchUrl": "https://www.justwatch.com/us/search?q=Bottle%20Rocket"
  },
  {
    "tt": "tt90030045",
    "title": "Rounders",
    "poster": "https://m.media-amazon.com/images/M/MV5BMWQ1NTVjZjYtNzlhYi00YmQ2LWFhM2EtMWY4MGE3NzVmZGQzXkEyXkFqcGc@._V1_FMjpg_UY2250_.jpg",
    "trailer": "https://www.youtube.com/watch?v=9r-K5dmt0Rc",
    "year": 1998,
    "genres": [
      "Crime",
      "Drama"
    ],
    "director": "John Dahl",
    "actors": [
      "Matt Damon",
      "Edward Norton",
      "John Malkovich"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90030045",
    "watchUrl": "https://www.justwatch.com/us/search?q=Rounders"
  },
  {
    "tt": "tt90030046",
    "title": "The Matrix",
    "poster": "https://m.media-amazon.com/images/M/MV5BN2NmN2VhMTQtMDNiOS00NDlhLTliMjgtODE2ZTY0ODQyNDRhXkEyXkFqcGc@._V1_FMjpg_UY3156_.jpg",
    "trailer": "https://www.youtube.com/watch?v=vKQi3bBA1y8",
    "year": 1999,
    "genres": [
      "Action",
      "Sci-Fi"
    ],
    "director": "Lana Wachowski & Lilly Wachowski",
    "actors": [
      "Keanu Reeves",
      "Laurence Fishburne",
      "Carrie-Anne Moss"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90030046",
    "watchUrl": "https://www.justwatch.com/us/search?q=The%20Matrix"
  },
  {
    "tt": "tt90030047",
    "title": "Malcolm X",
    "poster": "https://m.media-amazon.com/images/M/MV5BYTQwYjFhNTMtMjliOC00MGJhLTkwYWMtYjQzZTRiYjRlNjE4XkEyXkFqcGc@._V1_FMjpg_UY2260_.jpg",
    "trailer": "https://www.youtube.com/watch?v=sx4sEvhYeVE",
    "year": 1992,
    "genres": [
      "Biography",
      "Drama",
      "History"
    ],
    "director": "Spike Lee",
    "actors": [
      "Denzel Washington",
      "Angela Bassett",
      "Albert Hall"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90030047",
    "watchUrl": "https://www.justwatch.com/us/search?q=Malcolm%20X"
  },
  {
    "tt": "tt90030048",
    "title": "Quiz Show",
    "poster": "https://m.media-amazon.com/images/M/MV5BYzYyMjAzN2YtYTJiNC00MDhhLWE0MmUtZTE0ZmUxODU3MzkyXkEyXkFqcGc@._V1_FMjpg_UY2938_.jpg",
    "trailer": "https://www.youtube.com/watch?v=bj-m3Ddmn0E",
    "year": 1994,
    "genres": [
      "Biography",
      "Drama",
      "History"
    ],
    "director": "Robert Redford",
    "actors": [
      "Ralph Fiennes",
      "John Turturro",
      "Rob Morrow"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90030048",
    "watchUrl": "https://www.justwatch.com/us/search?q=Quiz%20Show"
  }
];

const SEED_LIST_5 = [
  {
    "tt": "tt0081398",
    "title": "Raging Bull",
    "poster": "https://m.media-amazon.com/images/M/MV5BMjlkYmYyZWQtNTZkOS00ZjA0LWEwNWUtNzE2ZGNiYjg0MjA2XkEyXkFqcGc@._V1_FMjpg_UX679_.jpg",
    "trailer": "https://www.youtube.com/watch?v=F2UKuKxCJqc",
    "year": 1980,
    "genres": [
      "Biography",
      "Drama",
      "Sport"
    ],
    "director": "Martin Scorsese",
    "actors": [
      "Robert De Niro",
      "Cathy Moriarty",
      "Joe Pesci"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0081398",
    "watchUrl": "https://www.themoviedb.org/movie/1578/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0083866",
    "title": "E.T. the Extra-Terrestrial",
    "poster": "https://m.media-amazon.com/images/M/MV5BYTNhNmY0YWMtMTczYi00MTA0LThhMmUtMTIxYzE0Y2QwMzRlXkEyXkFqcGc@._V1_FMjpg_UX930_.jpg",
    "trailer": "https://www.youtube.com/watch?v=qYAETtIIClk",
    "year": 1982,
    "genres": [
      "Family",
      "Sci-Fi",
      "Adventure"
    ],
    "director": "Steven Spielberg",
    "actors": [
      "Henry Thomas",
      "Drew Barrymore",
      "Dee Wallace"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0083866",
    "watchUrl": "https://www.themoviedb.org/movie/601/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0082971",
    "title": "Raiders of the Lost Ark",
    "poster": "https://m.media-amazon.com/images/M/MV5BOGNhMjg2ZjgtYzk4Ni00MTViLTg1MmUtYzM2MDZiYjZlMmU3XkEyXkFqcGc@._V1_FMjpg_UX942_.jpg",
    "trailer": "https://www.youtube.com/watch?v=h2tY82z3xXU",
    "year": 1981,
    "genres": [
      "Action",
      "Adventure"
    ],
    "director": "Steven Spielberg",
    "actors": [
      "Harrison Ford",
      "Karen Allen",
      "Paul Freeman"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0082971",
    "watchUrl": "https://www.themoviedb.org/movie/85/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0086879",
    "title": "Amadeus",
    "poster": "https://m.media-amazon.com/images/M/MV5BMzc2MjM0NTMtOGY4NC00NzY1LWE2ODUtZjMzY2RhNGNkZDAyXkEyXkFqcGc@._V1_FMjpg_UX962_.jpg",
    "trailer": "https://www.youtube.com/watch?v=r7kWQj9FCGY",
    "year": 1984,
    "genres": [
      "Biography",
      "Drama",
      "History",
      "Music"
    ],
    "director": "Miloš Forman",
    "actors": [
      "F. Murray Abraham",
      "Tom Hulce",
      "Elizabeth Berridge"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0086879",
    "watchUrl": "https://www.themoviedb.org/movie/279/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0091763",
    "title": "Platoon",
    "poster": "https://m.media-amazon.com/images/M/MV5BZjE4YjllODAtZGMxZS00Mjg2LThkOWUtZjNkMjQ5YThiNDU4XkEyXkFqcGc@._V1_FMjpg_UX909_.jpg",
    "trailer": "https://www.youtube.com/watch?v=R8weLPF4qBQ",
    "year": 1986,
    "genres": [
      "Drama",
      "War"
    ],
    "director": "Oliver Stone",
    "actors": [
      "Charlie Sheen",
      "Tom Berenger",
      "Willem Dafoe"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0091763",
    "watchUrl": "https://www.themoviedb.org/movie/792/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0095765",
    "title": "Cinema Paradiso",
    "poster": "https://m.media-amazon.com/images/M/MV5BOTczOTE2OTYtZTVhOC00NThhLThlMmUtNjdmMDE1MjZjNmNmXkEyXkFqcGc@._V1_FMjpg_UX1074_.jpg",
    "trailer": "https://www.youtube.com/watch?v=C2-GX0Tltgw",
    "year": 1988,
    "genres": [
      "Drama",
      "Romance"
    ],
    "director": "Giuseppe Tornatore",
    "actors": [
      "Philippe Noiret",
      "Enzo Cannavale",
      "Antonella Attili"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0095765",
    "watchUrl": "https://www.themoviedb.org/movie/11216/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0087843",
    "title": "Once Upon a Time in America",
    "poster": "https://m.media-amazon.com/images/M/MV5BMDQ0ZTg2OGUtZjMyOC00M2M5LThkMmItZmM2MmUzMmIxMWJhXkEyXkFqcGc@._V1_FMjpg_UY3000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=LcpCRyNo8T8",
    "year": 1984,
    "genres": [
      "Crime",
      "Drama"
    ],
    "director": "Sergio Leone",
    "actors": [
      "Robert De Niro",
      "James Woods",
      "Elizabeth McGovern"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0087843",
    "watchUrl": "https://www.themoviedb.org/movie/311/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0083658",
    "title": "Blade Runner",
    "poster": "https://m.media-amazon.com/images/M/MV5BOWQ4YTBmNTQtMDYxMC00NGFjLTkwOGQtNzdhNmY1Nzc1MzUxXkEyXkFqcGc@._V1_FMjpg_UY4250_.jpg",
    "trailer": "https://www.youtube.com/watch?v=eogpIG53Cis",
    "year": 1982,
    "genres": [
      "Sci-Fi",
      "Thriller"
    ],
    "director": "Ridley Scott",
    "actors": [
      "Harrison Ford",
      "Rutger Hauer",
      "Sean Young"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0083658",
    "watchUrl": "https://www.themoviedb.org/movie/78/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0089881",
    "title": "Ran",
    "poster": "https://m.media-amazon.com/images/M/MV5BZDk2NDY5YjktMjEyMC00OTJhLTkzM2EtY2Q4Y2RjYzc2Yjk4XkEyXkFqcGc@._V1_FMjpg_UY2883_.jpg",
    "trailer": "https://www.youtube.com/watch?v=YwP_kXyd-Rw",
    "year": 1985,
    "genres": [
      "Drama",
      "War"
    ],
    "director": "Akira Kurosawa",
    "actors": [
      "Tatsuya Nakadai",
      "Akira Terao",
      "Jinpachi Nezu"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0089881",
    "watchUrl": "https://www.themoviedb.org/movie/11645/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0097216",
    "title": "Do the Right Thing",
    "poster": "https://m.media-amazon.com/images/M/MV5BODA2MjU1NTI1MV5BMl5BanBnXkFtZTgwOTU4ODIwMjE@._V1_FMjpg_UY4878_.jpg",
    "trailer": "https://www.youtube.com/watch?v=yVAD4fYRcvA",
    "year": 1989,
    "genres": [
      "Comedy",
      "Drama"
    ],
    "director": "Spike Lee",
    "actors": [
      "Danny Aiello",
      "Ossie Davis",
      "Ruby Dee"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0097216",
    "watchUrl": "https://www.themoviedb.org/movie/925/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0090756",
    "title": "Blue Velvet",
    "poster": "https://m.media-amazon.com/images/M/MV5BNzkwZGUyYjQtM2QyOC00MTBjLWE0NGYtMTZmOGM5MjI0Mzg0XkEyXkFqcGc@._V1_FMjpg_UY4035_.jpg",
    "trailer": "https://www.youtube.com/watch?v=rAA6imfqMYQ",
    "year": 1986,
    "genres": [
      "Drama",
      "Mystery",
      "Thriller"
    ],
    "director": "David Lynch",
    "actors": [
      "Isabella Rossellini",
      "Kyle MacLachlan",
      "Dennis Hopper"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0090756",
    "watchUrl": "https://www.themoviedb.org/movie/793/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0080684",
    "title": "Star Wars: Episode V - The Empire Strikes Back",
    "poster": "https://m.media-amazon.com/images/M/MV5BMTkxNGFlNDktZmJkNC00MDdhLTg0MTEtZjZiYWI3MGE5NWIwXkEyXkFqcGc@._V1_FMjpg_UY2883_.jpg",
    "trailer": "https://www.youtube.com/watch?v=JNwNXF9Y6kY",
    "year": 1980,
    "genres": [
      "Action",
      "Adventure",
      "Fantasy",
      "Sci-Fi"
    ],
    "director": "Irvin Kershner",
    "actors": [
      "Mark Hamill",
      "Harrison Ford",
      "Carrie Fisher"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0080684",
    "watchUrl": "https://www.themoviedb.org/movie/1891/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0080678",
    "title": "The Elephant Man",
    "poster": "https://m.media-amazon.com/images/M/MV5BMGE3MDZhNmMtMmUxZS00MDJmLTgxYmQtOGU4ODU0Y2JmNDI1XkEyXkFqcGc@._V1_FMjpg_UX757_.jpg",
    "trailer": "https://www.youtube.com/watch?v=ZvJuJKOmZAY",
    "year": 1980,
    "genres": [
      "Biography",
      "Drama"
    ],
    "director": "David Lynch",
    "actors": [
      "John Hurt",
      "Anthony Hopkins",
      "Anne Bancroft"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0080678",
    "watchUrl": "https://www.themoviedb.org/movie/1955/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0081505",
    "title": "The Shining",
    "poster": "https://m.media-amazon.com/images/M/MV5BNmM5ZThhY2ItOGRjOS00NzZiLWEwYTItNDgyMjFkOTgxMmRiXkEyXkFqcGc@._V1_FMjpg_UX627_.jpg",
    "trailer": "https://www.youtube.com/watch?v=S014oGZiSdI",
    "year": 1980,
    "genres": [
      "Horror",
      "Drama"
    ],
    "director": "Stanley Kubrick",
    "actors": [
      "Jack Nicholson",
      "Shelley Duvall",
      "Danny Lloyd"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0081505",
    "watchUrl": "https://www.themoviedb.org/movie/694/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0093058",
    "title": "Full Metal Jacket",
    "poster": "https://m.media-amazon.com/images/M/MV5BYWUzNzZkNzUtNDdiYy00Nzk5LTgxMmItNTk0MjRjNjdjNDA0XkEyXkFqcGc@._V1_FMjpg_UX1066_.jpg",
    "trailer": "https://www.youtube.com/watch?v=Ks_MbPPkhmA",
    "year": 1987,
    "genres": [
      "Drama",
      "War"
    ],
    "director": "Stanley Kubrick",
    "actors": [
      "Matthew Modine",
      "R. Lee Ermey",
      "Vincent D’Onofrio"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0093058",
    "watchUrl": "https://www.themoviedb.org/movie/600/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0088846",
    "title": "Brazil",
    "poster": "https://m.media-amazon.com/images/M/MV5BOGY1Y2Q2MjMtODFjMS00NGJlLThmYjYtMWZhOGEyNTc2ZDYxXkEyXkFqcGc@._V1_FMjpg_UX580_.jpg",
    "trailer": "https://www.youtube.com/watch?v=ZKPFC8DA9_8",
    "year": 1985,
    "genres": [
      "Drama",
      "Sci-Fi",
      "Fantasy"
    ],
    "director": "Terry Gilliam",
    "actors": [
      "Jonathan Pryce",
      "Kim Greist",
      "Robert De Niro"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0088846",
    "watchUrl": "https://www.themoviedb.org/movie/68/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0080339",
    "title": "Airplane!",
    "poster": "https://m.media-amazon.com/images/M/MV5BNGMxMDRhMjItMDNlZi00MDIzLWE5MDQtODljMDQ3MWM1Y2E4XkEyXkFqcGc@._V1_FMjpg_UX623_.jpg",
    "trailer": "https://www.youtube.com/watch?v=07pPmCfKi3U",
    "year": 1980,
    "genres": [
      "Comedy"
    ],
    "director": "Jim Abrahams, David Zucker, Jerry Zucker",
    "actors": [
      "Robert Hays",
      "Julie Hagerty",
      "Leslie Nielsen"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0080339",
    "watchUrl": "https://www.themoviedb.org/movie/813/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0082096",
    "title": "Das Boot",
    "poster": "https://m.media-amazon.com/images/M/MV5BNGU0MWZlMTUtM2Y3Ny00NGNmLWE5NmEtN2YxOWQzMGM3ZWYzXkEyXkFqcGc@._V1_FMjpg_UY2290_.jpg",
    "trailer": "https://www.youtube.com/watch?v=KhNnU4h1Q50",
    "year": 1981,
    "genres": [
      "Drama",
      "War",
      "Thriller"
    ],
    "director": "Wolfgang Petersen",
    "actors": [
      "Jürgen Prochnow",
      "Herbert Grönemeyer",
      "Klaus Wennemann"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0082096",
    "watchUrl": "https://www.themoviedb.org/movie/387/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0084805",
    "title": "Tootsie",
    "poster": "https://m.media-amazon.com/images/M/MV5BNzc1YjU5NzEtMmZjYi00NzE2LThjMmEtMzY1ZTg5ZjgyM2EzXkEyXkFqcGc@._V1_FMjpg_UY2265_.jpg",
    "trailer": "https://www.youtube.com/watch?v=4U9hfQujTcM",
    "year": 1982,
    "genres": [
      "Comedy",
      "Drama",
      "Romance"
    ],
    "director": "Sydney Pollack",
    "actors": [
      "Dustin Hoffman",
      "Jessica Lange",
      "Teri Garr"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0084805",
    "watchUrl": "https://www.themoviedb.org/movie/9576/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0094226",
    "title": "The Untouchables",
    "poster": "https://m.media-amazon.com/images/M/MV5BYjVlNTk3NGYtOWE0OC00MDI4LThlZWItZGMwMTdmYzcwM2Y5XkEyXkFqcGc@._V1_FMjpg_UX942_.jpg",
    "trailer": "https://www.youtube.com/watch?v=2cGat1xI8G8",
    "year": 1987,
    "genres": [
      "Crime",
      "Drama",
      "Thriller"
    ],
    "director": "Brian De Palma",
    "actors": [
      "Kevin Costner",
      "Sean Connery",
      "Robert De Niro"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0094226",
    "watchUrl": "https://www.themoviedb.org/movie/117/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0088247",
    "title": "The Terminator",
    "poster": "https://m.media-amazon.com/images/M/MV5BZmE0YzIxM2QtMGNlMi00MjRmLWE3MWMtOWQzMGVjMmU0YTFmXkEyXkFqcGc@._V1_FMjpg_UX1066_.jpg",
    "trailer": "https://www.youtube.com/watch?v=k64P4l2Wmeg",
    "year": 1984,
    "genres": [
      "Action",
      "Sci-Fi"
    ],
    "director": "James Cameron",
    "actors": [
      "Arnold Schwarzenegger",
      "Linda Hamilton",
      "Michael Biehn"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0088247",
    "watchUrl": "https://www.themoviedb.org/movie/218/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0095016",
    "title": "Die Hard",
    "poster": "https://m.media-amazon.com/images/M/MV5BMGNlYmM1NmQtYWExMS00NmRjLTg5ZmEtMmYyYzJkMzljYWMxXkEyXkFqcGc@._V1_FMjpg_UX1066_.jpg",
    "trailer": "https://www.youtube.com/watch?v=2TQ-pOvI6Xo",
    "year": 1988,
    "genres": [
      "Action",
      "Thriller"
    ],
    "director": "John McTiernan",
    "actors": [
      "Bruce Willis",
      "Alan Rickman",
      "Bonnie Bedelia"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0095016",
    "watchUrl": "https://www.themoviedb.org/movie/562/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0093389",
    "title": "The Last Emperor",
    "poster": "https://m.media-amazon.com/images/M/MV5BYjIxYWFiMDgtZTgyMy00MjFiLWIyMmEtNGIyZjc1NTRlMzQ3XkEyXkFqcGc@._V1_FMjpg_UY3000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=A4cH6g1wD5g",
    "year": 1987,
    "genres": [
      "Biography",
      "Drama",
      "History"
    ],
    "director": "Bernardo Bertolucci",
    "actors": [
      "John Lone",
      "Joan Chen",
      "Peter O’Toole"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0093389",
    "watchUrl": "https://www.themoviedb.org/movie/746/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt0083987",
    "title": "Gandhi",
    "poster": "https://m.media-amazon.com/images/M/MV5BNTg3ODhlZTEtM2Q3MC00YzMxLWJjN2YtOWUyMDIyYTlhYzM3XkEyXkFqcGc@._V1_FMjpg_UY2265_.jpg",
    "trailer": "https://www.youtube.com/watch?v=B7I6D3mSYTE",
    "year": 1982,
    "genres": [
      "Biography",
      "Drama",
      "History"
    ],
    "director": "Richard Attenborough",
    "actors": [
      "Ben Kingsley",
      "Candice Bergen",
      "Edward Fox"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt0083987",
    "watchUrl": "https://www.themoviedb.org/movie/783/watch?translate=false&locale=AU"
  },
  {
    "tt": "tt90040025",
    "title": "Raising Arizona",
    "poster": "https://m.media-amazon.com/images/M/MV5BYjM0MmMyYTctYjMyNS00ZmI4LWIyODAtZDRkOWQ2YmQ2MjAyXkEyXkFqcGc@._V1_FMjpg_UX1252_.jpg",
    "trailer": "https://www.youtube.com/watch?v=OjWu8i6eMZo",
    "year": 1987,
    "genres": [
      "Comedy",
      "Crime"
    ],
    "director": "Joel Coen & Ethan Coen",
    "actors": [
      "Nicolas Cage",
      "Holly Hunter",
      "Trey Wilson"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040025",
    "watchUrl": "https://www.justwatch.com/us/search?q=Raising%20Arizona"
  },
  {
    "tt": "tt90040026",
    "title": "The Princess Bride",
    "poster": "https://m.media-amazon.com/images/M/MV5BMjFiOTEyNGMtN2E4MC00ZjZlLTk3ZDQtNTU1ZGNiZTA1MzJlXkEyXkFqcGc@._V1_FMjpg_UY4219_.jpg",
    "trailer": "https://www.youtube.com/watch?v=O3CIXEAjcc8",
    "year": 1987,
    "genres": [
      "Adventure",
      "Family",
      "Fantasy",
      "Romance"
    ],
    "director": "Rob Reiner",
    "actors": [
      "Cary Elwes",
      "Robin Wright",
      "Mandy Patinkin"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040026",
    "watchUrl": "https://www.justwatch.com/us/search?q=The%20Princess%20Bride"
  },
  {
    "tt": "tt90040027",
    "title": "The Big Chill",
    "poster": "https://m.media-amazon.com/images/M/MV5BN2FhNzM2OGItNGNiZS00MjcxLTlkNmYtNjkwMzk1NWRmY2VhXkEyXkFqcGc@._V1_FMjpg_UY6305_.jpg",
    "trailer": "https://www.youtube.com/watch?v=hHUwAZdQFBg",
    "year": 1983,
    "genres": [
      "Comedy",
      "Drama"
    ],
    "director": "Lawrence Kasdan",
    "actors": [
      "Tom Berenger",
      "Glenn Close",
      "Jeff Goldblum"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040027",
    "watchUrl": "https://www.justwatch.com/us/search?q=The%20Big%20Chill"
  },
  {
    "tt": "tt90040028",
    "title": "Fast Times at Ridgemont High",
    "poster": "https://m.media-amazon.com/images/M/MV5BMWM4NTc3N2YtMjk2Ny00MTRmLWE4YzItNTVhMTRlODVkNmE5XkEyXkFqcGc@._V1_FMjpg_UX995_.jpg",
    "trailer": "https://www.youtube.com/watch?v=vzva_I8WPAg",
    "year": 1982,
    "genres": [
      "Comedy",
      "Drama",
      "Romance"
    ],
    "director": "Amy Heckerling",
    "actors": [
      "Sean Penn",
      "Jennifer Jason Leigh",
      "Judge Reinhold"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040028",
    "watchUrl": "https://www.justwatch.com/us/search?q=Fast%20Times%20at%20Ridgemont%20High"
  },
  {
    "tt": "tt90040029",
    "title": "Scarface",
    "poster": "https://m.media-amazon.com/images/M/MV5BNDUzYjY0NmUtMDM4OS00Y2Q5LWJiODYtNTk0ZTk0YjZhMTg1XkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=7pQQHnqBa2E",
    "year": 1983,
    "genres": [
      "Crime",
      "Drama"
    ],
    "director": "Brian De Palma",
    "actors": [
      "Al Pacino",
      "Michelle Pfeiffer",
      "Steven Bauer"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040029",
    "watchUrl": "https://www.justwatch.com/us/search?q=Scarface"
  },
  {
    "tt": "tt90040030",
    "title": "A Christmas Story",
    "poster": "https://m.media-amazon.com/images/M/MV5BZWZhYzI1YjktYzJjYy00NjIwLWE0MGItNWM4YWM2ZjFkNGM0XkEyXkFqcGc@._V1_FMjpg_UX985_.jpg",
    "trailer": "https://www.youtube.com/watch?v=cfjEZ88NHBw",
    "year": 1983,
    "genres": [
      "Comedy",
      "Family"
    ],
    "director": "Bob Clark",
    "actors": [
      "Peter Billingsley",
      "Melinda Dillon",
      "Darren McGavin"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040030",
    "watchUrl": "https://www.justwatch.com/us/search?q=A%20Christmas%20Story"
  },
  {
    "tt": "tt90040031",
    "title": "Poltergeist",
    "poster": "https://m.media-amazon.com/images/M/MV5BNzY4MGZkYjgtYTQ2YS00YTlhLWEyMjAtMjZhYzczNTRlM2ZmXkEyXkFqcGc@._V1_FMjpg_UY2714_.jpg",
    "trailer": "https://www.youtube.com/watch?v=9eZgEKjYJqA",
    "year": 1982,
    "genres": [
      "Horror",
      "Thriller"
    ],
    "director": "Tobe Hooper",
    "actors": [
      "JoBeth Williams",
      "Heather O’Rourke",
      "Craig T. Nelson"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040031",
    "watchUrl": "https://www.justwatch.com/us/search?q=Poltergeist"
  },
  {
    "tt": "tt90040032",
    "title": "Terms of Endearment",
    "poster": "https://m.media-amazon.com/images/M/MV5BMTk0ODM4NDk0MF5BMl5BanBnXkFtZTgwMTEzMDUxMDE@._V1_FMjpg_UX675_.jpg",
    "trailer": "https://www.youtube.com/watch?v=sSY3YUrdSJI",
    "year": 1983,
    "genres": [
      "Comedy",
      "Drama"
    ],
    "director": "James L. Brooks",
    "actors": [
      "Shirley MacLaine",
      "Debra Winger",
      "Jack Nicholson"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040032",
    "watchUrl": "https://www.justwatch.com/us/search?q=Terms%20of%20Endearment"
  },
  {
    "tt": "tt90040033",
    "title": "This Is Spinal Tap",
    "poster": "https://m.media-amazon.com/images/M/MV5BMTQ2MTIzMzg5Nl5BMl5BanBnXkFtZTgwOTc5NDI1MDE@._V1_FMjpg_UX653_.jpg",
    "trailer": "https://www.youtube.com/watch?v=N63XSUpe-0o",
    "year": 1984,
    "genres": [
      "Comedy",
      "Music",
      "Mockumentary"
    ],
    "director": "Rob Reiner",
    "actors": [
      "Christopher Guest",
      "Michael McKean",
      "Harry Shearer"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040033",
    "watchUrl": "https://www.justwatch.com/us/search?q=This%20Is%20Spinal%20Tap"
  },
  {
    "tt": "tt90040034",
    "title": "Crimes and Misdemeanors",
    "poster": "https://m.media-amazon.com/images/M/MV5BNTQwZjFjODItNzI3ZS00ODUzLWI3MWUtNjU2NDQwNjQxMjhlXkEyXkFqcGc@._V1_FMjpg_UX1002_.jpg",
    "trailer": "https://www.youtube.com/watch?v=JBzlQ7bUtKk",
    "year": 1989,
    "genres": [
      "Comedy",
      "Drama"
    ],
    "director": "Woody Allen",
    "actors": [
      "Martin Landau",
      "Woody Allen",
      "Anjelica Huston"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040034",
    "watchUrl": "https://www.justwatch.com/us/search?q=Crimes%20and%20Misdemeanors"
  },
  {
    "tt": "tt90040035",
    "title": "Sex, Lies, and Videotape",
    "poster": "https://m.media-amazon.com/images/M/MV5BZmFjNjkyNmQtMDdkNy00YmQxLWFmZTYtZDQyYTY3ZGFjYmFiXkEyXkFqcGc@._V1_FMjpg_UY2265_.jpg",
    "trailer": "https://www.youtube.com/watch?v=Fa-3y73Flvk",
    "year": 1989,
    "genres": [
      "Drama"
    ],
    "director": "Steven Soderbergh",
    "actors": [
      "James Spader",
      "Andie MacDowell",
      "Peter Gallagher"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040035",
    "watchUrl": "https://www.justwatch.com/us/search?q=Sex%2C%20Lies%2C%20and%20Videotape"
  },
  {
    "tt": "tt90040036",
    "title": "Back to the Future",
    "poster": "https://m.media-amazon.com/images/M/MV5BZmM3ZjE0NzctNjBiOC00MDZmLTgzMTUtNGVlOWFlOTNiZDJiXkEyXkFqcGc@._V1_FMjpg_UX1218_.jpg",
    "trailer": "https://www.youtube.com/watch?v=qvsgGtivCgs",
    "year": 1985,
    "genres": [
      "Adventure",
      "Comedy",
      "Sci-Fi"
    ],
    "director": "Robert Zemeckis",
    "actors": [
      "Michael J. Fox",
      "Christopher Lloyd",
      "Lea Thompson"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040036",
    "watchUrl": "https://www.justwatch.com/us/search?q=Back%20to%20the%20Future"
  },
  {
    "tt": "tt90040037",
    "title": "Rain Man",
    "poster": "https://m.media-amazon.com/images/M/MV5BZDUzODNkNGUtNzJjNi00ODFlLTkzMzktMGNkOTIwYWM2YTQzXkEyXkFqcGc@._V1_FMjpg_UX623_.jpg",
    "trailer": "https://www.youtube.com/watch?v=mlNwXuHUA8I",
    "year": 1988,
    "genres": [
      "Drama"
    ],
    "director": "Barry Levinson",
    "actors": [
      "Dustin Hoffman",
      "Tom Cruise",
      "Valeria Golino"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040037",
    "watchUrl": "https://www.justwatch.com/us/search?q=Rain%20Man"
  },
  {
    "tt": "tt90040038",
    "title": "Ordinary People",
    "poster": "https://m.media-amazon.com/images/M/MV5BODc0OTkwOTUtZjdiNi00MTYzLWJlMzAtODE3MzA0YzM2ZDUyXkEyXkFqcGc@._V1_FMjpg_UY2175_.jpg",
    "trailer": "https://www.youtube.com/watch?v=HQKEdiQ79OM",
    "year": 1980,
    "genres": [
      "Drama"
    ],
    "director": "Robert Redford",
    "actors": [
      "Donald Sutherland",
      "Mary Tyler Moore",
      "Timothy Hutton"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040038",
    "watchUrl": "https://www.justwatch.com/us/search?q=Ordinary%20People"
  },
  {
    "tt": "tt90040039",
    "title": "Who Framed Roger Rabbit",
    "poster": "https://m.media-amazon.com/images/M/MV5BMDc5ZGRiM2EtMWRmMC00YjViLWEwMjYtNGE5MWVlZGEzZGM0XkEyXkFqcGc@._V1_FMjpg_UX1015_.jpg",
    "trailer": "https://www.youtube.com/watch?v=tYkZNPBxZyk",
    "year": 1988,
    "genres": [
      "Animation",
      "Adventure",
      "Comedy",
      "Crime",
      "Family",
      "Fantasy",
      "Mystery"
    ],
    "director": "Robert Zemeckis",
    "actors": [
      "Bob Hoskins",
      "Christopher Lloyd",
      "Joanna Cassidy"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040039",
    "watchUrl": "https://www.justwatch.com/us/search?q=Who%20Framed%20Roger%20Rabbit"
  },
  {
    "tt": "tt90040040",
    "title": "Hannah and Her Sisters",
    "poster": "https://m.media-amazon.com/images/M/MV5BNTdmOWViYWMtMjVjNC00MDI5LTk3ZmEtM2MxMzFkMzQ5NzNjXkEyXkFqcGc@._V1_FMjpg_UX960_.jpg",
    "trailer": "https://www.youtube.com/watch?v=vTiiMIvtiuY",
    "year": 1986,
    "genres": [
      "Comedy",
      "Drama"
    ],
    "director": "Woody Allen",
    "actors": [
      "Mia Farrow",
      "Michael Caine",
      "Barbara Hershey"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040040",
    "watchUrl": "https://www.justwatch.com/us/search?q=Hannah%20and%20Her%20Sisters"
  },
  {
    "tt": "tt90040041",
    "title": "When Harry Met Sally...",
    "poster": "https://m.media-amazon.com/images/M/MV5BMjE0ODEwNjM2NF5BMl5BanBnXkFtZTcwMjU2Mzg3NA@@._V1_FMjpg_UX682_.jpg",
    "trailer": "https://www.youtube.com/watch?v=V8DgDmUHVto",
    "year": 1989,
    "genres": [
      "Comedy",
      "Drama",
      "Romance"
    ],
    "director": "Rob Reiner",
    "actors": [
      "Billy Crystal",
      "Meg Ryan",
      "Carrie Fisher"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040041",
    "watchUrl": "https://www.justwatch.com/us/search?q=When%20Harry%20Met%20Sally..."
  },
  {
    "tt": "tt90040042",
    "title": "Henry V",
    "poster": "https://m.media-amazon.com/images/M/MV5BNzNiMWM3NGEtZWMxYi00NzM0LWE2ODItMzZlNTZmYTJhZWY1XkEyXkFqcGc@._V1_FMjpg_UY2265_.jpg",
    "trailer": "https://www.youtube.com/watch?v=sJZTlrQZMjY",
    "year": 1989,
    "genres": [
      "Biography",
      "Drama",
      "History",
      "War"
    ],
    "director": "Kenneth Branagh",
    "actors": [
      "Kenneth Branagh",
      "Derek Jacobi",
      "Simon Shepherd"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040042",
    "watchUrl": "https://www.justwatch.com/us/search?q=Henry%20V"
  },
  {
    "tt": "tt90040043",
    "title": "Blood Simple",
    "poster": "https://m.media-amazon.com/images/M/MV5BNTYxNWY5ODktYWRkOC00NDdkLWIwOGQtOWY5YWQ1N2Q3OWViXkEyXkFqcGc@._V1_FMjpg_UY2935_.jpg",
    "trailer": "https://www.youtube.com/watch?v=TFzPVLdGtAg",
    "year": 1984,
    "genres": [
      "Crime",
      "Drama",
      "Thriller"
    ],
    "director": "Joel Coen & Ethan Coen",
    "actors": [
      "John Getz",
      "Frances McDormand",
      "Dan Hedaya"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040043",
    "watchUrl": "https://www.justwatch.com/us/search?q=Blood%20Simple"
  },
  {
    "tt": "tt90040044",
    "title": "The Right Stuff",
    "poster": "https://m.media-amazon.com/images/M/MV5BZmNiMWIxZDEtYWE0Zi00YzU5LTk4NzctNmE2YThiMGUzYzlkXkEyXkFqcGc@._V1_FMjpg_UX1005_.jpg",
    "trailer": "https://www.youtube.com/watch?v=ElzIPn1pXWE",
    "year": 1983,
    "genres": [
      "Biography",
      "Drama",
      "History"
    ],
    "director": "Philip Kaufman",
    "actors": [
      "Sam Shepard",
      "Scott Glenn",
      "Ed Harris"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040044",
    "watchUrl": "https://www.justwatch.com/us/search?q=The%20Right%20Stuff"
  },
  {
    "tt": "tt90040045",
    "title": "The Color Purple",
    "poster": "https://m.media-amazon.com/images/M/MV5BM2MyZjBlMGItNThkMi00YWExLThlZmUtZmI2MGM3YWE3YTY1XkEyXkFqcGc@._V1_FMjpg_UX665_.jpg",
    "trailer": "https://www.youtube.com/watch?v=HzGrDgu08r8",
    "year": 1985,
    "genres": [
      "Drama"
    ],
    "director": "Steven Spielberg",
    "actors": [
      "Danny Glover",
      "Whoopi Goldberg",
      "Oprah Winfrey"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040045",
    "watchUrl": "https://www.justwatch.com/us/search?q=The%20Color%20Purple"
  },
  {
    "tt": "tt90040046",
    "title": "Kagemusha: The Shadow Warrior",
    "poster": "https://m.media-amazon.com/images/M/MV5BYmJlMTQwZmMtNGRhMy00MjgzLTliNDYtZTliYjIxY2I0NTA4XkEyXkFqcGc@._V1_FMjpg_UY3000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=Fvn3giWYZTg",
    "year": 1980,
    "genres": [
      "Drama",
      "History",
      "War"
    ],
    "director": "Akira Kurosawa",
    "actors": [
      "Tatsuya Nakadai",
      "Tsutomu Yamazaki",
      "Kenichi Hagiwara"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040046",
    "watchUrl": "https://www.justwatch.com/us/search?q=Kagemusha%3A%20The%20Shadow%20Warrior"
  },
  {
    "tt": "tt90040047",
    "title": "Wings of Desire",
    "poster": "https://m.media-amazon.com/images/M/MV5BYTUwY2EyMDktMGI0Ny00MDNlLWE0ODMtZWIwOGNhNmY1OWIwXkEyXkFqcGc@._V1_FMjpg_UY3000_.jpg",
    "trailer": "https://www.youtube.com/watch?v=liAOEb5rnbA",
    "year": 1987,
    "genres": [
      "Drama",
      "Fantasy",
      "Romance"
    ],
    "director": "Wim Wenders",
    "actors": [
      "Bruno Ganz",
      "Solveig Dommartin",
      "Otto Sander"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040047",
    "watchUrl": "https://www.justwatch.com/us/search?q=Wings%20of%20Desire"
  },
  {
    "tt": "tt90040048",
    "title": "The Little Mermaid",
    "poster": "https://m.media-amazon.com/images/M/MV5BNmQ3ODcyZGMtMjNlOS00YzhlLTg0YzAtZGVjNmQ0OTYyNDg0XkEyXkFqcGc@._V1_FMjpg_UX1001_.jpg",
    "trailer": "https://www.youtube.com/watch?v=ai1RlvqicrU",
    "year": 1989,
    "genres": [
      "Animation",
      "Family",
      "Fantasy",
      "Musical",
      "Romance"
    ],
    "director": "Ron Clements & John Musker",
    "actors": [
      "Jodi Benson",
      "Samuel E. Wright",
      "Rene Auberjonois"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040048",
    "watchUrl": "https://www.justwatch.com/us/search?q=The%20Little%20Mermaid"
  },
  {
    "tt": "tt90040049",
    "title": "Tender Mercies",
    "poster": "https://m.media-amazon.com/images/M/MV5BY2FkNDgyN2MtMDQ2YS00NTM1LWFhNDctNGEyMzBiYmI5NDRhXkEyXkFqcGc@._V1_FMjpg_UY2260_.jpg",
    "trailer": "https://www.youtube.com/watch?v=0P_Rs0RkYD4",
    "year": 1983,
    "genres": [
      "Drama",
      "Music"
    ],
    "director": "Bruce Beresford",
    "actors": [
      "Robert Duvall",
      "Tess Harper",
      "Betty Buckley"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040049",
    "watchUrl": "https://www.justwatch.com/us/search?q=Tender%20Mercies"
  },
  {
    "tt": "tt90040050",
    "title": "Chariots of Fire",
    "poster": "https://m.media-amazon.com/images/M/MV5BZjkzZjFmZDEtNTliZi00MDcwLThjMTMtNmI5OGVmYjZjZDM1XkEyXkFqcGc@._V1_FMjpg_UY2853_.jpg",
    "trailer": "https://www.youtube.com/watch?v=odtqtlhsv4E",
    "year": 1981,
    "genres": [
      "Biography",
      "Drama",
      "Sport"
    ],
    "director": "Hugh Hudson",
    "actors": [
      "Ben Cross",
      "Ian Charleson",
      "Nicholas Farrell"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040050",
    "watchUrl": "https://www.justwatch.com/us/search?q=Chariots%20of%20Fire"
  },
  {
    "tt": "tt90040051",
    "title": "Salvador",
    "poster": "https://m.media-amazon.com/images/M/MV5BNDRiMjdlNDMtYjJiNC00MGQyLWE5NzQtZWZlNDY2MTY0Nzg4XkEyXkFqcGc@._V1_FMjpg_UY3858_.jpg",
    "trailer": "https://www.youtube.com/watch?v=Od1wfZe6EvE",
    "year": 1986,
    "genres": [
      "Drama",
      "Thriller",
      "War"
    ],
    "director": "Oliver Stone",
    "actors": [
      "James Woods",
      "Jim Belushi",
      "Michael Murphy"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040051",
    "watchUrl": "https://www.justwatch.com/us/search?q=Salvador"
  },
  {
    "tt": "tt90040052",
    "title": "Atlantic City",
    "poster": "https://m.media-amazon.com/images/M/MV5BMzY3Mzc5YmEtMGYwNS00YjJkLWE2NjQtOWNiM2RlNWFhMTY1XkEyXkFqcGc@._V1_FMjpg_UY2216_.jpg",
    "trailer": "https://www.youtube.com/watch?v=PSeajV6cv1o",
    "year": 1980,
    "genres": [
      "Crime",
      "Drama",
      "Romance"
    ],
    "director": "Louis Malle",
    "actors": [
      "Burt Lancaster",
      "Susan Sarandon",
      "Kate Reid"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040052",
    "watchUrl": "https://www.justwatch.com/us/search?q=Atlantic%20City"
  },
  {
    "tt": "tt90040053",
    "title": "My Left Foot",
    "poster": "https://m.media-amazon.com/images/M/MV5BYzU2NDY0YzItOTVhNS00Yzk4LTg0ZTktNjFiZDJmZTgwMDYyXkEyXkFqcGc@._V1_FMjpg_UX960_.jpg",
    "trailer": "https://www.youtube.com/watch?v=xj7yME23Hes",
    "year": 1989,
    "genres": [
      "Biography",
      "Drama"
    ],
    "director": "Jim Sheridan",
    "actors": [
      "Daniel Day-Lewis",
      "Brenda Fricker",
      "Alison Whelan"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040053",
    "watchUrl": "https://www.justwatch.com/us/search?q=My%20Left%20Foot"
  },
  {
    "tt": "tt90040054",
    "title": "Glory",
    "poster": "https://m.media-amazon.com/images/M/MV5BOTA1NDcyOGMtYTc0Zi00OTQ0LTllZTEtMTIxZDcxMWYxZTVhXkEyXkFqcGc@._V1_FMjpg_UY1890_.jpg",
    "trailer": "https://www.youtube.com/watch?v=-OS-OE1EcHI",
    "year": 1989,
    "genres": [
      "Biography",
      "Drama",
      "History",
      "War"
    ],
    "director": "Edward Zwick",
    "actors": [
      "Matthew Broderick",
      "Denzel Washington",
      "Cary Elwes"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040054",
    "watchUrl": "https://www.justwatch.com/us/search?q=Glory"
  },
  {
    "tt": "tt90040055",
    "title": "Jean de Florette",
    "poster": "https://m.media-amazon.com/images/M/MV5BZjliZjBkNTEtODcyOS00ZGFlLWFmMTAtMTBmOTJkNmQ4MDgwXkEyXkFqcGc@._V1_FMjpg_UY3150_.jpg",
    "trailer": "https://www.youtube.com/watch?v=rDJXPiyvQfg",
    "year": 1986,
    "genres": [
      "Drama"
    ],
    "director": "Claude Berri",
    "actors": [
      "Yves Montand",
      "Gérard Depardieu",
      "Daniel Auteuil"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040055",
    "watchUrl": "https://www.justwatch.com/us/search?q=Jean%20de%20Florette"
  },
  {
    "tt": "tt90040056",
    "title": "The Killing Fields",
    "poster": "https://m.media-amazon.com/images/M/MV5BYWFiNThiZjUtMzMxZS00MmY5LWE3NzYtYjU5NjAwOTEwZGMyXkEyXkFqcGc@._V1_FMjpg_UY2222_.jpg",
    "trailer": "https://www.youtube.com/watch?v=0Um2j1iEj1k",
    "year": 1984,
    "genres": [
      "Biography",
      "Drama",
      "History",
      "War"
    ],
    "director": "Roland Joffé",
    "actors": [
      "Sam Waterston",
      "Haing S. Ngor",
      "John Malkovich"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040056",
    "watchUrl": "https://www.justwatch.com/us/search?q=The%20Killing%20Fields"
  },
  {
    "tt": "tt90040057",
    "title": "The Last Metro",
    "poster": "https://m.media-amazon.com/images/M/MV5BYmFiMTFlMzUtN2JmNS00MGIzLWEzOTUtY2RkNjQ2OTY2MDZiXkEyXkFqcGc@._V1_FMjpg_UY2756_.jpg",
    "trailer": "https://www.youtube.com/watch?v=ZoOwtGjD6oc",
    "year": 1980,
    "genres": [
      "Drama",
      "Romance",
      "War"
    ],
    "director": "François Truffaut",
    "actors": [
      "Catherine Deneuve",
      "Gérard Depardieu",
      "Jean Poiret"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040057",
    "watchUrl": "https://www.justwatch.com/us/search?q=The%20Last%20Metro"
  },
  {
    "tt": "tt90040058",
    "title": "A Room with a View",
    "poster": "https://m.media-amazon.com/images/M/MV5BOTkwNTZhMWUtOTNmZC00NmE0LWExOGItMzJiNzEyNWNmODI1XkEyXkFqcGc@._V1_FMjpg_UX1107_.jpg",
    "trailer": "https://www.youtube.com/watch?v=YCJQ_XOHr3g",
    "year": 1985,
    "genres": [
      "Drama",
      "Romance"
    ],
    "director": "James Ivory",
    "actors": [
      "Maggie Smith",
      "Helena Bonham Carter",
      "Julian Sands"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040058",
    "watchUrl": "https://www.justwatch.com/us/search?q=A%20Room%20with%20a%20View"
  },
  {
    "tt": "tt90040059",
    "title": "A Passage to India",
    "poster": "https://m.media-amazon.com/images/M/MV5BMDg5NTFiMGQtZTBhZS00Njc5LWE4NzAtNzVkNzVlNTVlMDExXkEyXkFqcGc@._V1_FMjpg_UX500_.jpg",
    "trailer": "https://www.youtube.com/watch?v=UxaPT6UbdAE",
    "year": 1984,
    "genres": [
      "Adventure",
      "Drama",
      "History"
    ],
    "director": "David Lean",
    "actors": [
      "Judy Davis",
      "Victor Banerjee",
      "Peggy Ashcroft"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040059",
    "watchUrl": "https://www.justwatch.com/us/search?q=A%20Passage%20to%20India"
  },
  {
    "tt": "tt90040060",
    "title": "Missing",
    "poster": "https://m.media-amazon.com/images/M/MV5BYWZjMmViODItNGU2ZS00YWIxLTk0MDUtOTgxMTQ1OWUyYjYwXkEyXkFqcGc@._V1_FMjpg_UX500_.jpg",
    "trailer": "https://www.youtube.com/watch?v=X1WiQxDAeV4",
    "year": 1982,
    "genres": [
      "Biography",
      "Drama",
      "History",
      "Mystery",
      "Thriller"
    ],
    "director": "Costa-Gavras",
    "actors": [
      "Jack Lemmon",
      "Sissy Spacek",
      "Melanie Mayron"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040060",
    "watchUrl": "https://www.justwatch.com/us/search?q=Missing"
  },
  {
    "tt": "tt90040061",
    "title": "Places in the Heart",
    "poster": "https://m.media-amazon.com/images/M/MV5BOGU1OWVhZDMtNWI2My00OWM5LWE4YmUtOWYwZjcxZWY1NDJlXkEyXkFqcGc@._V1_FMjpg_UY7500_.jpg",
    "trailer": "https://www.youtube.com/watch?v=PzCPWZbsN2E",
    "year": 1984,
    "genres": [
      "Drama"
    ],
    "director": "Robert Benton",
    "actors": [
      "Sally Field",
      "Lindsay Crouse",
      "Danny Glover"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040061",
    "watchUrl": "https://www.justwatch.com/us/search?q=Places%20in%20the%20Heart"
  },
  {
    "tt": "tt90040062",
    "title": "A Soldier's Story",
    "poster": "https://m.media-amazon.com/images/M/MV5BNTY1NjhkMjMtNTQwZi00MjkzLThhNmItYTIwOTg3ODlkYzBkXkEyXkFqcGc@._V1_FMjpg_UY2265_.jpg",
    "trailer": "https://www.youtube.com/watch?v=uORTbOxLW_I",
    "year": 1984,
    "genres": [
      "Drama",
      "Mystery",
      "War"
    ],
    "director": "Norman Jewison",
    "actors": [
      "Howard E. Rollins Jr.",
      "Adolph Caesar",
      "Denzel Washington"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040062",
    "watchUrl": "https://www.justwatch.com/us/search?q=A%20Soldier's%20Story"
  },
  {
    "tt": "tt90040063",
    "title": "Prizzi's Honor",
    "poster": "https://m.media-amazon.com/images/M/MV5BMjFiYjUzZWEtZmQxMy00NzI1LWJiZjUtNjA4MTczOTY2MjM0XkEyXkFqcGc@._V1_FMjpg_UX500_.jpg",
    "trailer": "https://www.youtube.com/watch?v=d-31JOJaTNw",
    "year": 1985,
    "genres": [
      "Comedy",
      "Crime",
      "Drama"
    ],
    "director": "John Huston",
    "actors": [
      "Jack Nicholson",
      "Kathleen Turner",
      "Anjelica Huston"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040063",
    "watchUrl": "https://www.justwatch.com/us/search?q=Prizzi's%20Honor"
  },
  {
    "tt": "tt90040064",
    "title": "A Fish Called Wanda",
    "poster": "https://m.media-amazon.com/images/M/MV5BNjFhZDg1ZmEtYmI0Ny00MjM3LWIxNzItMzU1MzczZTljMTkxXkEyXkFqcGc@._V1_FMjpg_UX1067_.jpg",
    "trailer": "https://www.youtube.com/watch?v=0WTwVpEEMps",
    "year": 1988,
    "genres": [
      "Comedy",
      "Crime"
    ],
    "director": "Charles Crichton & John Cleese",
    "actors": [
      "John Cleese",
      "Jamie Lee Curtis",
      "Kevin Kline"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040064",
    "watchUrl": "https://www.justwatch.com/us/search?q=A%20Fish%20Called%20Wanda"
  },
  {
    "tt": "tt90040065",
    "title": "Witness",
    "poster": "https://m.media-amazon.com/images/M/MV5BNDcyNjU5MWMtNDZiYy00Yjc4LWE4YjItMTA5ODBlOGU1NzRhXkEyXkFqcGc@._V1_FMjpg_UY2834_.jpg",
    "trailer": "https://www.youtube.com/watch?v=T9AtV8FIzFI",
    "year": 1985,
    "genres": [
      "Crime",
      "Drama",
      "Romance",
      "Thriller"
    ],
    "director": "Peter Weir",
    "actors": [
      "Harrison Ford",
      "Kelly McGillis",
      "Lukas Haas"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040065",
    "watchUrl": "https://www.justwatch.com/us/search?q=Witness"
  },
  {
    "tt": "tt90040066",
    "title": "Driving Miss Daisy",
    "poster": "https://m.media-amazon.com/images/M/MV5BN2M2MWUyZmQtMmI4Yi00NGE2LWFiZmEtNDZkZmYxNWRlM2Y1XkEyXkFqcGc@._V1_FMjpg_UX985_.jpg",
    "trailer": "https://www.youtube.com/watch?v=TQ3wXC5jqKE",
    "year": 1989,
    "genres": [
      "Comedy",
      "Drama"
    ],
    "director": "Bruce Beresford",
    "actors": [
      "Morgan Freeman",
      "Jessica Tandy",
      "Dan Aykroyd"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040066",
    "watchUrl": "https://www.justwatch.com/us/search?q=Driving%20Miss%20Daisy"
  },
  {
    "tt": "tt90040067",
    "title": "Fanny and Alexander",
    "poster": "https://m.media-amazon.com/images/M/MV5BNjIwMzRhZWUtOTA0YS00MmFmLWI4ZjgtNjNlZmU3M2Q1Y2NhXkEyXkFqcGc@._V1_FMjpg_UX580_.jpg",
    "trailer": "https://www.youtube.com/watch?v=tDlA_QZmqkM",
    "year": 1982,
    "genres": [
      "Drama"
    ],
    "director": "Ingmar Bergman",
    "actors": [
      "Bertil Guve",
      "Pernilla Allwin",
      "Jan Malmsjö"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040067",
    "watchUrl": "https://www.justwatch.com/us/search?q=Fanny%20and%20Alexander"
  },
  {
    "tt": "tt90040068",
    "title": "Star Wars: Episode VI - Return of the Jedi",
    "poster": "https://m.media-amazon.com/images/M/MV5BNWEwOTI0MmUtMGNmNy00ODViLTlkZDQtZTg1YmQ3MDgyNTUzXkEyXkFqcGc@._V1_FMjpg_UY2809_.jpg",
    "trailer": "https://www.youtube.com/watch?v=7L8p7_SLzvU",
    "year": 1983,
    "genres": [
      "Action",
      "Adventure",
      "Fantasy",
      "Sci-Fi"
    ],
    "director": "Richard Marquand",
    "actors": [
      "Mark Hamill",
      "Harrison Ford",
      "Carrie Fisher"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040068",
    "watchUrl": "https://www.justwatch.com/us/search?q=Star%20Wars%3A%20Episode%20VI%20-%20Return%20of%20the%20Jedi"
  },
  {
    "tt": "tt90040069",
    "title": "A Nightmare on Elm Street",
    "poster": "https://m.media-amazon.com/images/M/MV5BODBiZThjMTAtZGUyZS00ZDA5LThjYjEtNWIzMmIwNjBhNTVjXkEyXkFqcGc@._V1_FMjpg_UX605_.jpg",
    "trailer": "https://www.youtube.com/watch?v=dCVh4lBfW-c",
    "year": 1984,
    "genres": [
      "Horror"
    ],
    "director": "Wes Craven",
    "actors": [
      "Heather Langenkamp",
      "Johnny Depp",
      "Robert Englund"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040069",
    "watchUrl": "https://www.justwatch.com/us/search?q=A%20Nightmare%20on%20Elm%20Street"
  },
  {
    "tt": "tt90040070",
    "title": "Broadcast News",
    "poster": "https://m.media-amazon.com/images/M/MV5BMGVhZjNiYmUtMTAwYS00ZjQ0LWIyNGItNTU1OWNjYjA4ZDE5XkEyXkFqcGc@._V1_FMjpg_UX521_.jpg",
    "trailer": "https://www.youtube.com/watch?v=WXYq-X3E7Ag",
    "year": 1987,
    "genres": [
      "Comedy",
      "Drama",
      "Romance"
    ],
    "director": "James L. Brooks",
    "actors": [
      "William Hurt",
      "Albert Brooks",
      "Holly Hunter"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040070",
    "watchUrl": "https://www.justwatch.com/us/search?q=Broadcast%20News"
  },
  {
    "tt": "tt90040071",
    "title": "The King of Comedy",
    "poster": "https://m.media-amazon.com/images/M/MV5BYTQxNGUwNmUtMDJhYy00ZjM1LWFjZjQtYmI5ZGY4YTZmZWQyXkEyXkFqcGc@._V1_FMjpg_UY2821_.jpg",
    "trailer": "https://www.youtube.com/watch?v=0wVhCCo02P4",
    "year": 1982,
    "genres": [
      "Comedy",
      "Crime",
      "Drama"
    ],
    "director": "Martin Scorsese",
    "actors": [
      "Robert De Niro",
      "Jerry Lewis",
      "Diahnne Abbott"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040071",
    "watchUrl": "https://www.justwatch.com/us/search?q=The%20King%20of%20Comedy"
  },
  {
    "tt": "tt90040072",
    "title": "Bull Durham",
    "poster": "https://m.media-amazon.com/images/M/MV5BOGJiNmFmZjYtYzQzZi00ZTk1LWI2MGUtZjI1NDI3YmU4Y2FhXkEyXkFqcGc@._V1_FMjpg_UX1014_.jpg",
    "trailer": "https://www.youtube.com/watch?v=dnJFndf-Krg",
    "year": 1988,
    "genres": [
      "Comedy",
      "Romance",
      "Sport"
    ],
    "director": "Ron Shelton",
    "actors": [
      "Kevin Costner",
      "Susan Sarandon",
      "Tim Robbins"
    ],
    "imdbUrl": "https://www.imdb.com/title/tt90040072",
    "watchUrl": "https://www.justwatch.com/us/search?q=Bull%20Durham"
  }
];

export { SEED_LIST_1, SEED_LIST_2, SEED_LIST_3, SEED_LIST_4, SEED_LIST_5 };
