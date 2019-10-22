//NOTE: not used for now

module Email = {
  let validate = email => {
    let regexp = Str.regexp("^.*[@].*$");
    Str.string_match(regexp, email, 0);
  };
};
