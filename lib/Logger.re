let databaseConnectionError = (~port, exn) => {
  print_endline(Printexc.to_string(exn));
  print_endline(
    "❌ Error occured, connection to database  was not established!",
  );
  print_endline(
    "install postgresql and run pg_ctl -D /usr/local/var/postgres start and then try again",
  );
};