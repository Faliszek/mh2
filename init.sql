
create table users (user_id varchar(255) not null, email varchar(255) not  null, password text not null);


INSERT INTO users (user_id, email, password)
VALUES ('1', 'admin@test.com', '$2y$06$xGehPI6zB6jTLnXAWOfigOLaBKTyeRMct2ATSB6hPIL23f3c1QldC');
