import React, { useState, useEffect } from 'react';
import { Form } from "semantic-ui-react"
import {
  CardElement,
  Elements,
  useElements,
  useStripe
} from '@stripe/react-stripe-js';
import { connect } from 'react-redux';
import { signIn, signOut, setRelayUrl } from "../actions";
import apiClient from '../api/apiClient'

// Custom styling can be passed to options when creating an Element.
const CARD_ELEMENT_OPTIONS = {
    style: {
        base: {
          iconColor: 'blueviolet',
          color: 'black',
          fontWeight: 500,
          fontFamily: 'Roboto, Open Sans, Segoe UI, sans-serif',
          fontSize: '16px',
          fontSmoothing: 'antialiased',
          boxSizing: 'border-box',
          padding: '10px 12px',

          border: '1px solid transparent',
          borderRadius: '4px',
         
          '::placeholder': {
            color: 'blueviolet',
          },
          padding: '1em'
        },
        invalid: {
          iconColor: '#FFC7EE',
          color: '#FFC7EE',
        },
      },
};

const CheckoutForm = (props) => {
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [saveCard, setSaveCard] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const [existingCard, setExistingCard] = useState(null);
  const [paymentOption, setPaymentOption] = useState(null);



  const stripe = useStripe();
  const elements = useElements();

  useEffect(() => {
    // Update the document title using the browser API
    if (props.type === "subscription") {

      apiClient
      .createSubscriptionPaymentIntent({
        stripeCustomerId: props.currentUserObj.stripeCustomerId,
        plans: props.id,
        amount: props.amount
      })
      .then(res => {
        console.log("Res of createPaymentIntent %o", res);
        setClientSecret(res.data.clientSecret);
        console.log("props.clientSecret is %o", props.clientSecret);
        apiClient
          .fetchCustomerPaymentMethods(props.currentUserObj.stripeCustomerId)
          .then(card => {
            if (card) {
              console.log("Setting cards");
              setExistingCard(card);
            }
          });
      })

      .catch(err => {
        console.log("Payment Intent could not be created.", err);
      });


    } else {
      apiClient
        .createPaymentIntent({
          stripeCustomerId: props.currentUserObj.stripeCustomerId,
          listingId: props.id,
          quantity: props.quantity,
          amount: props.totalAmount,
          selectedDate: props.selectedDate
        })
        .then(res => {
          console.log("Res of createPaymentIntent %o", res);
          setClientSecret(res.data.clientSecret);
          console.log("props.clientSecret is %o", props.clientSecret);
          apiClient
            .fetchCustomerPaymentMethods(props.currentUserObj.stripeCustomerId)
            .then(card => {
              if (card) {
                console.log("Setting cards");
                setExistingCard(card);
              }
            });
        })

        .catch(err => {
          console.log("Payment Intent could not be created.", err);
        });
    }
    /*
      Set Redux value for clientSecret
      Or create a new intent everytime user opens this dialogbox
    */
  }, []);

  // Handle real-time validation errors from the card Element.
  const handleChange = (event) => {
    if (event.error) {
      setError(event.error.message);
    } else {
      setError(null);
    }
  }

  // Handle form submission.
  const handleSubmit = async (event) => {
    event.preventDefault();
    const card = elements.getElement(CardElement);
    const result = await stripe.createToken(card)
    if (result.error) {
      // Inform the user if there was an error.
      setError(result.error.message);
    } else {
      setError(null);
      // Send the token to your server.
      console.log('client secret is %o', clientSecret)
      stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: card
        },
        receipt_email: props.currentUserObj.email,
        setup_future_usage: saveCard ? "off_session" : ""
      })
      .then(function(result) {
        if (result.error) {
          // Show error to your customer
          setError(result.error.message);
        } else {
          // The payment has been processed!
          //response.paymentIntent && response.paymentIntent.status === 'succeeded'
          console.log('Result is %o', result.paymentIntent.status)
          setStatus(result.paymentIntent.status);
          props.paymentResult(result.paymentIntent.status)
          
        }
    });
  }
}

const handleSaveCard = () => {
  var tmp = !saveCard
  setSaveCard(tmp)
}

const renderLegalText = () => {
  if (saveCard) {
  return (
      <div className="sr-legal-text">
          Your card will be charge ${props.totalAmount}.00<span id="save-card-text"> and your card details will be saved to your account</span>.
      </div>
  )
  } else {
    return (

      <div className="sr-legal-text">
        Your card will be charge ${props.totalAmount}.00.
    </div>

    )
  }
}
const renderSubmitOrSpinner = () => {
  if (processing) {
    return (
    <div className="spinner" id="spinner"></div>
    )
  } else {
    return (
    <button type="submit" className="btn btn-full"><span id="button-text">Submit Payment</span></button>
    )
  }

}
const handlePaymentOption = (e) => {
  console.log("Value of radio button clicked is %o", e.target.value)
  setPaymentOption(e.target.value)
}

const displayPaymentOptions = () =>{
  const existingLabel = `Use card ending with ${existingCard.last4}`
    return (
      <div>
      <Form.Group inline>
          <label>How would you like to pay?</label>
          <Form.Radio label={existingLabel} checked={paymentOption === 'existing'} value="existing" onClick={() => setPaymentOption('existing')} />
          <Form.Radio label="Use a new card" checked={paymentOption === 'new'} value="new" onClick={() => setPaymentOption('new')} />
      </Form.Group>
    </div>
    )
}

const displayCardForm = () => {
  return (
    <div>
      <div>
        <div className="sr-combo-inputs-row" style={{borderStyle:"outset"}}>
        <CardElement
          id="card-element"
          options={CARD_ELEMENT_OPTIONS}
          onChange={handleChange}
        />
        </div>
        <div className="card-errors" role="alert" style={{color:"red"}}>{error}</div>
      </div>
      <div className="sr-form-row">
          <label className="sr-checkbox-label"><input type="checkbox" id="save-card" onClick={handleSaveCard}/> Save card for future payments</label>
      </div>
    </div>
  )
}
  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        {existingCard ? 
        <React.Fragment>
        {displayPaymentOptions()}
        { (paymentOption === "new") &&
                <React.Fragment>
                {displayCardForm()}
              </React.Fragment>
        }
        </React.Fragment> 
        :
        <React.Fragment>
          {displayCardForm()}
        </React.Fragment> 
        }
      </div>
      <div className="card-errors" role="alert">{status}</div>
        {renderLegalText()}
      <div className="submit-card-button">
        {renderSubmitOrSpinner()}
      </div>
    </form>
  );
}


// POST the token ID to your backend.
async function stripeTokenHandler(token) {
  const response = await fetch('/charge', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({token: token.id})
  });

  return response.json();
}

const mapStateToProps = state => {
  return {
    currentUserObj: state.auth.userObj,
    isSignedIn: state.auth.isSignedIn,
    relayUrl: state.relay.relayUrl
  };
};

export default connect(
  mapStateToProps,
  { signIn, signOut, setRelayUrl }
)(CheckoutForm);