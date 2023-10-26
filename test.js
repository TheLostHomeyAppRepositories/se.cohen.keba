'use strict';

const api = require('./lib/api');

class MyDriver {

  async onInit() {

    console.log('initialized');

    this.test();

  }

  test() {

    console.log('-> TEST');

    let settings = {
      'ip': '192.168.10.193',
      'port': '7090'
    }

    let kebaApi = new api.KebaApi(settings);
    

       

        kebaApi.getReport1()
          .then(result => {
            console.log('-- Success --')
            console.log(result);
            

            kebaApi.getReport2()
              .then(result => {
                console.log('-- Success --')
                console.log(result);

              })
              .catch((error) => {
                console.log('-- Error --')
                console.log(error);
              });
          })
          .catch((error) => {
            console.log('-- Error --')
            console.log(error);
          });
      




  }


}

// init test program and run
const d = new MyDriver();
d.onInit();