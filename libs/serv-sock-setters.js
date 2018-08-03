const serv = require('./serv-helpers.js');

function setSocketServer(io, db){
  const countClients = ws => Object.keys(ws.sockets.connected).length;
  return io.on('connection', socket => {
    console.log(`${countClients(io)} CLIENT(S) CONNECTED`);
    socket.on('disconnect', () => {
      console.log(`${countClients(io)} CLIENT(S) CONNECTED`);
    });

    // LOAD INITIAL RESERVATIONS
    socket.on('getReservations', () => {
      serv.getAllReservations(db)
        .then(data => { io.emit('loadReservations', data)})
        .catch(err => console.log(err));
    })

    socket.on('getReservationByResCode', data => {
      serv.getReservationByResCode(db, data)
        .then(data => { io.emit('loadReservation', data) })
        .catch(err => { console.log(err)} );
    })

    socket.on('getCustomerByResCode', data => {
      serv.getReservationByResCode(db, data)
      .then(reso => {
        return serv.getCustomerByReservation(db, reso)
      })
      .then(custo => {
        io.emit('loadCustomer', custo)
      })
      .catch(err => { console.log(err)} );
    })

/// GET MENU    
    socket.on('getMenu', () => {
      serv.getMenu(db)
        .then(menu => {
          //Specify which socket if necessary
          io.emit('returnedMenu', menu);
        })
        .catch(err => {console.log(err)});
    })

    //GET MENU ITEMS BY CATEGORY
    // socket.on('submitReservation', formData => {
    //   console.log('Server socket handling submit');
    //   serv.submitNewReservation(db, formData)
    //     .then(data => { io.emit('loadNewReservation', data); })
    //     .catch(err => {console.log(err)});
    // })


    // SUBMIT NEW RESERVATION
    socket.on('submitReservation', formData => {
      console.log('Server socket handling submit');
      serv.submitNewReservation(db, formData)
        .then(data => { io.emit('loadNewReservation', data); })
        .catch(err => {console.log(err)});
    })

    // UPDATE EXISTING RESERVATION
    socket.on('updateReservation', formData => {
      serv.updateReservation(db, formData)
        .then(data => { io.emit('loadChangedReservation', data) })
        .catch(err => console.log(err));
    });

    // CANCEL RESERVATION
    socket.on('cancelReservation', formData => {
      serv.cancelReservation(db, formData)
        .then(data => {
          io.emit('removeCancelledReservation', data);
        });
    })


    socket.on('getAllMenuItemOrders', status => {
      serv.getAllMenuItemOrders(db)
        .then(data => {
          io.emit('AllMenuItemOrders', data);
        })
        .catch(err => console.log(err));
    })

    socket.on('getItemOrdersWMenuItemInfo', status => {
      serv.getItemOrdersWMenuItemInfo(db)
        .then(data => {
          io.emit('ItemOrdersWMenuItemInfo', data);
        })
        .catch(err => console.log(err));
    })
    socket.on('addItemToOrder', status => {

      serv.addItemOrderWMenuItem(db, status)
      .then(data => {
        io.emit('newOrderAdded', data);
      })
      .catch(err => console.log(err));
    })
  })
}

module.exports = {
  setSocketServer
}
