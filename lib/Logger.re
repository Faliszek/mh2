let databaseConnectionError = exn => {
  print_endline(Printexc.to_string(exn));
  print_endline(
    "❌ Error occured, connection to database  was not established!",
  );
  print_endline(
    "install postgresql and run pg_ctl -D /usr/local/var/postgres start and then try again",
  );
};

let serverStartSuccess = (~port) => {
  let port = port |> string_of_int;

  print_endline("\n\n🐫 Server GraphQL running on " ++ port);
};

let serverStartFailure = exn => {
  Logs.err(m => m("\n\n❌ Unhandled exception: %a", Fmt.exn, exn));
};