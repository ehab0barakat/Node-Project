const mysql = require("mysql");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { promisify } = require('util');
const cookieParser = require('cookie-parser');
// app.use(cookieParser());

const db = mysql.createConnection({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE
});

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if( !email || !password ) {
      return res.status(400).render('login', {
        message: 'Please provide an email and password'
      })
    }

    db.query('SELECT * FROM users WHERE email = ?', [email], async (error, results) => {
      console.log(results.length);
      
      if( !results) {
        res.status(401).render('login', {
          message: 'Email or Password is incorrect'
        })
      } else {
        const id = results[0].id;
        const email = results[0].email;

        const token = jwt.sign({ id }, process.env.JWT_SECRET, {
          expiresIn: process.env.JWT_EXPIRES_IN
        });

        console.log("The token is: " + token);

        const cookieOptions = {
          expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000
          ),
          httpOnly: true
        }

        res.cookie('jwt', token, cookieOptions );
        res.cookie('email', email );
        res.status(200).redirect("/");
      }

    })

  } catch (error) {
    console.log(error);
  }
}

exports.register = (req, res) => {
  // console.log(req.body);

  const { name, email, password, passwordConfirm , isSeller } = req.body;

  db.query('SELECT email FROM users WHERE email = ?', [email], async (error, results) => {
    if(error) {
      console.log(error);
    }

    if( results.length > 0 ) {
      return res.render('register', {
        message: 'That email is already in use'
      })
    } else if( password !== passwordConfirm ) {
      return res.render('register', {
        message: 'Passwords do not match'
      });
    }


    // console.log("*****************");
    if ( isSeller == "on" ) {
      var iseller = 1 
    }else{ iseller = 0 
    }
    // console.log(iseller)
    // req.body.isSeller == "on" ? isSeller = 1 : isSeller = 0 ;

    // console.log("*****************");

    let hashedPassword = await bcrypt.hash(password, 8);
    // console.log(hashedPassword);
    res.cookie('email', email );
    db.query('INSERT INTO users SET ?', {name: name, email: email, password: hashedPassword , isSeller : iseller }, (error, results) => {
      if(error) {
        console.log(error);
      } else {
        console.log(results);
        return res.redirect('/login');
      }
    })


  });

}

exports.isLoggedIn = async (req, res, next) => {

  // console.log("qwertyuiop");
  // console.log( req.user[0]);
  // console.log( req.cookies);
  // console.log( req.cookies.email);
  // console.log("qwertyuiop");
  if( req.cookies.jwt) {
    try {
      // console.log("1");
      //1) verify the token
      const decoded = await promisify(jwt.verify)(req.cookies.jwt,
        process.env.JWT_SECRET
        );

        // console.log(decoded);
        // console.log(decoded.id);
        
        //2) Check if the user still exists
        db.query('SELECT * FROM users WHERE email =?', [req.cookies.email], (error, result) => {
          // console.log(result);
          
          if(!result) {
            return next();
          }
          
          req.user = result;
          console.log(req.user);
          return next();

        });
      } catch (error) {
        // console.log("2");
      console.log(error);
      return next();
    }
  } else {
    next();
  }
}

exports.logout = async (req, res) => {
  res.clearCookie("email");
  res.cookie('jwt', 'logout', {
    expires: new Date(Date.now() + 2*1000),
    httpOnly: true
  });

  res.status(200).redirect('/');
}