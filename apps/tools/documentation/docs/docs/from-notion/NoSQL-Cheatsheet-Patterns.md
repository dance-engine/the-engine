# NoSQL Cheatsheet / Patterns

Group By Date : 

THINGS#2025-01-22T00:00:00 - Group By Day

THINGS#2025-01-00T00:00:00 - Group by month

Singleton pattern

THINGS - contains things [”Thing”, ”Another Thing”, ”Sorta Thing”]

Caching for regular used

Store against a cache object 

THINGSCACHE - Single cache with the structure in a single meta attr.

THINGSCACH#1-9 - Multiple caches to stop hotspot issues with PK

Unique Counter

Store the count on object being counted e.g. THING#ytgads : likes= 367

Store THINGLIKE#ytgads#by_whom, THINGLIKE#ytgads#by_whom. Can find person in same way as below but cheaper

Store a THINGLIKE#ytgads, LIKE#by_whom  - check this to make sure before we update count and can be used to get this list of people. Should include details used for patterns needs to list

Sparse Index

Include a field for only that type of object and index on it

e.g. Get all users because they have userID column

e.g Get all unscanned tickets because they have a Unscanned entry