## CHANGES IN VERSION 1.14.6(from 1.14.5)
Sorting adds the following ways

1.multi order fields
```javascript
orders: [{
    order: 'desc',
    by: 'age'
  },{
    order: 'asc',
    by: 'id'
  }]
```
2.support object notation
```javascript
orders: {
  order: 'asc',
  by: 'id'
}
```