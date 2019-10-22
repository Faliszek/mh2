module Graphql_cohttp_lwt =
  Graphql_cohttp.Make(
    Graphql_lwt.Schema,
    Cohttp_lwt_unix.IO,
    Cohttp_lwt.Body,
  );

let schema =
  { open Graphql_lwt.Schema;
    schema(
      [Users.Graphql.list, Users.Graphql.one],
      ~mutations=[Auth.Graphql.loginMutation],
    )
  ; };

/* Access-Control-Allow-Headers: content-type
   // Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE
   // Access-Control-Allow-Origin: *
   // Allow: POST, GET, OPTIONS, PUT, DELETE */

let run = (~addres="127.0.0.1", ~port=6789, ()) => {
  open Cohttp_lwt_unix;
  /*TODO: handle failure better, also dont run server if connection is not established */
  Db.connect() |> Db.Lwt_thread.on_failure(_, Logger.databaseConnectionError);

  let on_exn =
    fun
    | Unix.Unix_error(error, func, arg) =>
      Logs.warn(m =>
        m(
          "Client connection error %s: %s(%S)",
          Unix.error_message(error),
          func,
          arg,
        )
      )
    | exn => Logger.serverStartFailure(exn);

  let callback =
    Graphql_cohttp_lwt.make_callback(req => print_endline("req"), schema);
  let server = Cohttp_lwt_unix.Server.make_response_action(~callback, ());
  let mode = `TCP(`Port(port));

  Logger.serverStartSuccess(~port);

  Lwt_main.run(Cohttp_lwt_unix.Server.create(~on_exn, ~mode, server));
};