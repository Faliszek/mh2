let run = (~addres="127.0.0.1", ~port=6789, ()) => {
  // open Cohttp;

  open Cohttp_lwt_unix;

  let server = {
    let callback = (_conn, req, body) => {
      let uri = req |> Request.uri |> Uri.to_string;
      let meth = req |> Request.meth |> Cohttp.Code.string_of_method;
      let headers = req |> Request.headers |> Cohttp.Header.to_string;
      body
      |> Cohttp_lwt.Body.to_string
      |> Lwt.map(body =>
           Printf.sprintf(
             "Uri: %s\nMethod: %s\nHeaders\nHeaders: %s\nBody: %s",
             uri,
             meth,
             headers,
             body,
           )
         )
      |> Lwt.bind(_, body => Server.respond_string(~status=`OK, ~body, ()));
    };

    Server.create(~mode=`TCP(`Port(8000)), Server.make(~callback, ()));
  };

  Lwt_main.run(server);
  ();
};