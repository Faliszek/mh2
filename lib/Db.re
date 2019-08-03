open Tablecloth;

module Lwt_thread = {
  include Lwt;
  let close_in = Lwt_io.close;
  let really_input = Lwt_io.read_into_exactly;
  let input_binary_int = Lwt_io.BE.read_int;
  let input_char = Lwt_io.read_char;
  let output_string = Lwt_io.write;
  let output_binary_int = Lwt_io.BE.write_int;
  let output_char = Lwt_io.write_char;
  let flush = Lwt_io.flush;
  let open_connection = a => Lwt_io.open_connection(a);
  type in_channel = Lwt_io.input_channel;
  type out_channel = Lwt_io.output_channel;
};

module PostgreSQL = PGOCaml_generic.Make(Lwt_thread);

let database = Sys.getenv("USER");
let connect = PostgreSQL.connect(~database);
let pool: Lwt_pool.t(PostgreSQL.t(Hashtbl.t(string, bool))) =
  Lwt_pool.create(16, ~validate=PostgreSQL.alive, connect);
let withPool = f => Lwt_pool.use(pool, f);

let runQuery = f => withPool(f);

module PGOCaml = PostgreSQL;

module User = {
  type t = {
    id: string,
    email: string,
    password: string,
  };

  module Query = {
    let getByEmail = [%sqlf
      {|
       SELECT * FROM users WHERE email = $email LIMIT 1;
      |}
    ];
  };

  let getByEmail = (~email) =>
    Query.getByEmail(~email)
    |> runQuery
    |> Lwt.map(user => {
         user
         |> List.head
         |> Option.map(~f=((id, email, password)) => {id, email, password})
       });
};