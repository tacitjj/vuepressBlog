---
title: HashMap详解
date: 2023-01-21
categories: Java
tags:
- java
- map
---

## HashMap

 

[TOC]



### 1.摘要



HashMap是Java程序员使用频率最高的用于映射(键值对)处理的数据类型。随着JDK（Java Developmet Kit）版本的更新，JDK1.8 对HashMap底层的实现进⾏了优化，例如引⼊红⿊树 的数据结构和扩容的优化等。本文结合JDK1.7和JDK1.8的区别，深入探讨HashMap的结构 实现和功能原理。

 

### 2.简介

 

Java为数据结构中的映射定义了⼀个接⼝java.util.Map ，此接⼝主要有四个常⽤的实现类， 分别是HashMap、Hashtable、LinkedHashMap 和TreeMap，类继承关系如下图所示：

![image-20230122114743732](https://cdn.jsdelivr.net/gh/tacitjj/picture/image/202301221147780.png) 

下面针对各个实现类的特点做⼀些说明：

(1) **HashMap** ：它根据键的hashCode值存储数据，⼤多数情况下可以直接定位到它的值， 因而具有很快的访问速度，但遍历顺序却是不确定的。 HashMap最多只允许⼀条记录的键 为null，允许多条记录的值为null。HashMap非线程安全，即任一时刻可以有多个线程同时写HashMap，可能会导致数据的不一致。如果需要满⾜线程安全，可以⽤ Collections的 synchronizedMap⽅法使HashMap具有线程安全的能⼒力力，或者使用ConcurrentHashMap。

(2) **Hashtable** ：Hashtable 是遗留类，很多映射的常⽤功能与HashMap类似，不同的是它承自Dictionary类，并且是线程安全的，任⼀时间只有一个线程能写Hashtable ，并发性不如ConcurrentHashMap，因为ConcurrentHashMap引⼊了分段锁。

::: tip
jdk1.8 中的 ConcurrentHashMap 中废弃了 Segment 锁，直接使用了数组元素，数组中的每个元素都可以作为一个锁。在元素中没有值的情况下，可以直接通过 CAS 操作来设值，同时保证并发安全；如果元素里面已经存在值的话，那么就使用 synchronized 关键字对元素加锁，再进行之后的 hash 冲突处理。
:::

Hashtable不建议在新代码中使用，不需要线程安全的场合可以⽤HashMap 替换，需要线程安全的场合可以用 ConcurrentHashMap替换。

 

(3) **LinkedHashMap** ：LinkedHashMap是HashMap的⼀个子类，保存了记录的插⼊顺序， 在⽤Iterator 遍历LinkedHashMap时，先得到的记录肯定是先插入的，也可以在构造时带参数，按照访问次序排序。

 

(4) **TreeMap** ：TreeMap 实现SortedMap接口，能够把它保存的记录根据键排序，默认是按键值的升序排序，也可以指定排序的⽐较器器，当用Iterator遍历TreeMap时，得到的记录是排过序的。如果使用排序的映射，建议使用TreeMap 。在使用TreeMap 时，key必须实现 Comparable 接口或者在构造TreeMap传⼊自定义的Comparator ，否则会在运行时抛出 java.lang.ClassCastException类型的异常。



对于上述四种Map类型的类，要求映射中的key是不可变对象。 **不可变对象是该对象在创建后它的哈希值不会被改变** 。如果对象的哈希值发⽣变化，Map对象很可能就定位不到映射的位置了。

 通过上面的⽐较，我们知了HashMap是Java的Map家族中一个普通成员，鉴于它可以满足大多数场景的使⽤条件，所以是使用频度最⾼的一个。下文我们主要结合源码，从存储结构、常用⽅法分析、扩容以及安全性等方面深入讲解HashMap的⼯作原理。 



### 3.内部实现



搞清楚HashMap，⾸先需要知道HashMap是什么，即它的存储结构-字段；其次弄明⽩它能干什么，即它的功能实现-⽅法。下⾯我们针对这两个⽅⾯详细展开讲解。



*存储结构-字段*

::: tip

从结构实现来讲，HashMap是数组+链表+红⿊树（JDK1.8增加了红⿊树部分）实现 的，如下如所示。

:::

![image-20230122114651932](https://cdn.jsdelivr.net/gh/tacitjj/picture/image/202301221146021.png)



这里需要讲明白两个问题：数据底层具体存储的是什么？这样的存储⽅式有什么优点呢？

 (1) 从源码可知，HashMap类中有⼀个⾮常重要的字段，就是 Node[] table，即哈希桶数组，明显它是一个Node的数组。我们来看Node[JDK1.8]是何物。

```java
    static class Node<K,V> implements Map.Entry<K,V> {
        final int hash;  //用来定位数组索引位置
        final K key;
        V value;
        Node<K,V> next;    //链表的下一个node

        Node(int hash, K key, V value, Node<K,V> next) {
            this.hash = hash;
            this.key = key;
            this.value = value;
            this.next = next;
        }

        public final K getKey()        { return key; }
        public final V getValue()      { return value; }
        public final String toString() { return key + "=" + value; }

        public final int hashCode() {
            return Objects.hashCode(key) ^ Objects.hashCode(value);
        }

        public final V setValue(V newValue) {
            V oldValue = value;
            value = newValue;
            return oldValue;
        }

        public final boolean equals(Object o) {
            if (o == this)
                return true;
            if (o instanceof Map.Entry) {
                Map.Entry<?,?> e = (Map.Entry<?,?>)o;
                if (Objects.equals(key, e.getKey()) &&
                    Objects.equals(value, e.getValue()))
                    return true;
            }
            return false;
        }
    }
```

 Node是HashMap的⼀个内部类，实现了Map.Entry接⼝，本质是就是⼀个映射(键值对)。上图中的每个黑色圆点就是一个Node对象。

(2) HashMap就是使⽤哈希表来存储的。哈希表为解决冲突，可以采用开放地址法和链地址法等来解决问题，Java中HashMap采用了链地址法。链地址法，简单来说，就是数组加链表的结合。在每个数组元素上都⼀个链表结构，当数据被Hash后，得到数组下标，把数据 放在对应下标元素的链表上。例如程序执⾏下⾯代码：

```java
map.put("金金","小金"); 
```

系统将调⽤"金金"这个key的hashCode()⽅法得到其hashCode 值（该⽅法适用于每个Java 对象），然后再通过Hash算法的后两步运算（⾼位运算和取模运算，下文有介绍）来定位该键值对的存储位置，有时两个key会定位到相同的位置，表示发⽣了Hash碰撞。当然 Hash算法计算结果越分散均匀，Hash碰撞的概率就越⼩，map的存取效率就会越高。 

如果哈希桶数组很大，即使较差的Hash算法也会⽐较分散，如果哈希桶数组数组很小，即使好的Hash算法也会出现较多碰撞，所以就需要在空间成本和时间成本之间权衡，其实就是在根据实际情况确定哈希桶数组的⼤⼩，并在此基础上设计好的hash算法减少Hash碰撞。那么通过什么⽅式来控制map使得Hash碰撞的概率⼜小，哈希桶数组（Node[] table） 占⽤空间⼜少呢？答案就是好的Hash算法和扩容机制。

在理解Hash和扩容流程之前，我们得先了解下HashMap 的几个字段。从HashMap的默认构造函数源码可知，构造函数就是对下面⼏几个字段进行初始化，源码如下：

```java
/**
 * The number of key-value mappings contained in this map.
 */
transient int size;

/**
 * The number of times this HashMap has been structurally modified
 * Structural modifications are those that change the number of mappings in
 * the HashMap or otherwise modify its internal structure (e.g.,
 * rehash).  This field is used to make iterators on Collection-views of
 * the HashMap fail-fast.  (See ConcurrentModificationException).
 */
transient int modCount;

/**
 * The next size value at which to resize (capacity * load factor).
 *
 * @serial
 */
// (The javadoc description is true upon serialization.
// Additionally, if the table array has not been allocated, this
// field holds the initial array capacity, or zero signifying
// DEFAULT_INITIAL_CAPACITY.)
int threshold;              //所容纳的key-value对极限

/**
 * The load factor for the hash table.
 *
 * @serial
 */
final float loadFactor;    //负载因子
```

 

⾸先，Node[] table的初始化长度length(默认值是16)，`loadFactor` 为负载因⼦(默认值是 0.75)，`threshold`是HashMap所能容纳的最大数据量的Node(键值对)个数。`threshold = length * loadFactor` 。也就是说，在数组定义好长度之后，负载因子越⼤，所能容纳的键值对个数越多。 

结合负载因⼦的定义公式可知，`threshold`就是在此`loadFactor` 和length(数组长度)对应下允许的最大元素数目，超过这个数目就重新resize(扩容)，扩容后的HashMap容量是之前容量的两倍。默认的负载因⼦0.75是对空间和时间效率的一个平衡选择，建议大家不要修改， 除非在时间和空间⽐较特殊的情况下，如果内存空间很多⽽⼜对时间效率要求很高，可以降低负载因子`loadFactor` 的值；相反，如果内存空间紧张而对时间效率要求不⾼，可以增加负载因⼦`loadFactor`的值，这个值可以大于1。

`size` 这个字段其实很好理解，就是HashMap中实际存在的键值对数量。注意和table的长度 length、容纳最大键值对数量`threshold`的区别。⽽modCount 字段主要⽤来记录HashMap内部结构发生变化的次数，主要⽤于迭代的快速失败。强调一点，内部结构发⽣变化指的是结构发生变化，例如put新键值对，但是某个key对应的value值被覆盖不属于结构变化。

在HashMap中，哈希桶数组table的长度length⼤⼩必须为2的n次方(⼀定是合数)，这是⼀种⾮常规的设计，常规的设计是把桶的大小设计为素数。相对来说素数导致冲突的概率要小于合数，Hashtable初始化桶⼤⼩为11，就是桶⼤⼩设计为素数的应用（Hashtable 扩容 后不能保证还是素数）。HashMap采⽤这种⾮常规设计，主要是为了在取模和扩容时做优化，同时为了减少冲突，HashMap定位哈希桶索引位置时，也加⼊了高位参与运算的过程。

这里存在一个问题，即使负载因⼦和Hash算法设计的再合理，也免不了会出现拉链过⻓的情况，⼀旦出现拉链过⻓，则会严重影响HashMap的性能。于是，在JDK1.8版本中，对数据结构做了进⼀步的优化，引入了红黑树。⽽当链表⻓度太长（默认超过8）时，链表就转换为红黑树，利用红黑树快速增删改查的特点提高HashMap 的性能，其中会用到红黑树的插入、删除、查找等算法。

 

### 4.功能实现-方法

 

HashMap的内部功能实现很多，本文主要从根据key获取哈希桶数组索引位置、put⽅法的详细执行、扩容过程三个具有代表性的点深⼊展开讲解。

#### 4.1 确定哈希桶数组索引位置 

不管增加、删除、查找键值对，定位到哈希桶数组的位置都是很关键的第一步。前⾯说过HashMap的数据结构是数组和链表的结合，所以我们当然希望这个HashMap⾥⾯的元素位置尽量分布均匀些，尽量使得每个位置上的元素数量只有⼀个，那么当我们用hash算法求得这个位置的时候，⻢上就可以知道对应位置的元素就是我们要的，不用遍历链表，大优化了查询的效率。HashMap定位数组索引位置，直接决定了hash⽅法的离散性能。先看源码的实现(<u>⽅法⼀</u>+<u>⽅法二</u>):

```java
    //⽅法⼀：
    static final int hash(Object key) { //jdk1.8 & jdk1.7
        
        int h;

        // h = key.hashCode() 为第⼀步 取hashCode值
        // h ^ (h >>> 16)     为第⼆步 高位参与运算
        return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
    }

    //⽅法二：
    static int indexFor(int h, int length) { //jdk1.7的源码，jdk1.8没有这个⽅法，但是实现原理⼀样的
        
        return h & (length - 1);  // 第三步 取模运算
    }
```



这⾥的Hash算法本质上就是三步： **取key的hashCode值、⾼位运算、取模运算**。 

对于任意给定的对象，只要它的hashCode()返回值相同，那么程序调⽤**⽅法⼀**所计算得到的Hash码值总是相同的。我们⾸先想到的就是把hash值对数组⻓度取模运算，这样⼀来， 元素的分布相对来说是⽐较均匀的。但是，模运算的消耗还是⽐较大的，在HashMap中是这样做的：调⽤**⽅法⼆**来计算该对象应该保存在table数组的哪个索引处。

这个⽅法⾮常巧妙，它通过 `h & (table.length -1)` 来得到该对象的保存位，⽽ HashMap底层数组的⻓度总是2的n次⽅，这是HashMap在速度上的优化。当length总是2的 n次⽅时，h& (length-1)运算等价于对length取模，也就是h%length，但是&⽐%具有更⾼的 效率。

::: tip

在JDK1.8的实现中，优化了⾼位运算的算法，通过hashCode()的高16位异或低16位实现的：(h = k.hashCode()) ^ (h >>> 16)，主要是从速度、功效、质量来考虑的，这么做可以在数组table的length⽐较⼩的时候，也能保证考虑到高低Bit都参与到Hash的计算中，同时不会有太⼤的开销。

:::

下⾯举例说明下，n为table的⻓度。

![image-20230122114543937](https://cdn.jsdelivr.net/gh/tacitjj/picture/image/202301221145986.png)



#### 4.2 分析hashMap的put方法

HashMap的put⽅法执⾏过程可以通过下图来理解，⾃己有兴趣可以去对⽐源码更清楚地研究学习。

![img](https://cdn.jsdelivr.net/gh/tacitjj/picture/image/202301221143231.png)

 

①.判断键值对数组table[i]是否为空或为null，否则执⾏resize()进⾏扩容； 

②.根据键值key计算hash值得到插⼊的数组索引i，如果table[i]==null ，直接新建节点添 加，转向⑥，如果table[i]不为空，转向③；

③.判断table[i]的⾸个元素是否和key⼀样，如果相同直接覆盖value，否则转向④，这⾥的相同指的是hashCode以及equals； 

④.判断table[i] 是否为treeNode，即table[i] 是否是红⿊树，如果是红⿊树，则直接在树中插⼊键值对，否则转向⑤；

⑤.遍历table[i]，判断链表⻓度是否大于8，大于8的话把链表转换为红⿊树，在红⿊树中执⾏插⼊操作，否则进⾏链表的插⼊操作；遍历过程中若发现key已经存在直接覆盖value即可；

⑥.插⼊成功后，判断实际存在的键值对数量size是否超多了最大容量threshold，如果超过，进⾏扩容。

JDK1.8HashMap的put⽅法源码如下:

```java
    public V put(K key, V value) {
				//对key的hashCode()做hash
        return putVal(hash(key), key, value, false, true);
    }
```

```java
  final V putVal(int hash, K key, V value, boolean onlyIfAbsent,
                   boolean evict) {
        //声明了一个局部变量 tab,局部变量 Node 类型的数据 p,int 类型 n,i
        Node<K,V>[] tab; Node<K,V> p; int n, i;
    
    		// 步骤①：tab为空则创建
        //首先将当前 hashmap 中的 table(哈希表)赋值给当前的局部变量 tab,然后判断tab 是不是空或者长度是不是 0,实际上就是判断当前 hashmap 中的哈希表是不是空或者长度等于 0
        if ((tab = table) == null || (n = tab.length) == 0)
        //如果是空的或者长度等于0,代表现在还没哈希表,所以需要创建新的哈希表,默认就是创建了一个长度为 16 的哈希表
            n = (tab = resize()).length;
    		// 步骤②：计算index，并对null做处理
        //将当前哈希表中与要插入的数据位置对应的数据取出来,(n - 1) & hash])就是找当前要插入的数据应该在哈希表中的位置,如果没找到,代表哈希表中当前的位置是空的,否则就代表找到数据了, 并赋值给变量 p
        if ((p = tab[i = (n - 1) & hash]) == null)
            tab[i] = newNode(hash, key, value, null);//创建一个新的数据,这个数据没有下一条,并将数据放到当前这个位置
        else {//代表要插入的数据所在的位置是有内容的
        //声明了一个节点 e, 一个 key k
            Node<K,V> e; K k;
						// 步骤③：节点key存在，直接覆盖value
            if (p.hash == hash && //如果当前位置上的那个数据的 hash 和我们要插入的 hash 是一样,代表没有放错位置
            //如果当前这个数据的 key 和我们要放的 key 是一样的,实际操作应该是就替换值
                ((k = p.key) == key || (key != null && key.equals(k))))
                //将当前的节点赋值给局部变量 e
                e = p;
          	// 步骤④：判断该链为红黑树
            else if (p instanceof TreeNode)//如果当前节点的 key 和要插入的 key 不一样,然后要判断当前节点是不是一个红黑色类型的节点
                e = ((TreeNode<K,V>)p).putTreeVal(this, tab, hash, key, value);//如果是就创建一个新的树节点,并把数据放进去
          	// 步骤⑤：该链为链表
            else {
                //如果不是树节点,代表当前是一个链表,那么就遍历链表
                for (int binCount = 0; ; ++binCount) {
                    if ((e = p.next) == null) {//如果当前节点的下一个是空的,就代表没有后面的数据了
                        p.next = newNode(hash, key, value, null);//创建一个新的节点数据并放到当前遍历的节点的后面
                        if (binCount >= TREEIFY_THRESHOLD - 1) // 重新计算当前链表的长度是不是超出了限制
                            treeifyBin(tab, hash);//超出了之后就将当前链表转换为树,注意转换树的时候,如果当前数组的长度小于MIN_TREEIFY_CAPACITY(默认 64),会触发扩容,我个人感觉可能是因为觉得一个节点下面的数据都超过8 了,说明 hash寻址重复的厉害(比如数组长度为 16 ,hash 值刚好是 0或者 16 的倍数,导致都去同一个位置),需要重新扩容重新 hash
                        break;
                    }
                    //如果当前遍历到的数据和要插入的数据的 key 是一样,和上面之前的一样,赋值给变量 e,下面替换内容
                    if (e.hash == hash &&
                        ((k = e.key) == key || (key != null && key.equals(k))))
                        break;
                    p = e;
                }
            }
            if (e != null) { //如果当前的节点不等于空,
                V oldValue = e.value;//将当前节点的值赋值给 oldvalue
                if (!onlyIfAbsent || oldValue == null)
                    e.value = value; //将当前要插入的 value 替换当前的节点里面值
                afterNodeAccess(e);
                return oldValue;
            }
        }
        ++modCount;//增加长度
    		// 步骤⑥：超过最⼤容量 扩容
        if (++size > threshold)
            resize();//如果当前的 hash表的长度已经超过了当前 hash 需要扩容的长度, 重新扩容,条件是 haspmap 中存放的数据超过了临界值(经过测试),而不是数组中被使用的下标
        afterNodeInsertion(evict);
        return null;
    }
```

 

#### 4.3 扩容机制

扩容(resize) 就是重新计算容量，向HashMap对象⾥不停的添加元素，⽽HashMap对象内部的数组⽆法装载更多的元素时，对象就需要扩大数组的⻓度，以便能装⼊更多的元素。当然Java⾥的数组是⽆法⾃动扩容的，⽅法是使⽤⼀个新的数组代替已有的容量⼩的数组， 就像我们⽤⼀个⼩桶装⽔，如果想装更多的⽔，就得换大⽔桶。

我们分析下resize的源码，鉴于JDK1.8融⼊了红⿊树，较复杂，为了便于理解我们仍然使⽤ JDK1.7的代码，好理解⼀些，本质上区别不大，具体区别后⽂再说。

```java
void resize(int newCapacity) { //传⼊新的容量
    Entry[] oldTable = table; //引⽤扩容前的Entry数组

    int oldCapacity = oldTable.length;

    if (oldCapacity == MAXIMUM_CAPACITY) { //扩容前的数组大⼩如果已经达到最大(2^30)了

    		threshold = Integer.MAX_VALUE; //修改阈值为int的最大值(2^31-1)，这 样以后就不会扩容了
				return;
		}

 

			Entry[] newTable = new Entry[newCapacity];  //初始化⼀个新的Entry数组
  
  	transfer(newTable); //！！将数据转移到新的Entry数组⾥
  
		table = newTable; //HashMap的table属性引⽤新的Entry数组

		threshold = (int)(newCapacity * loadFactor);//修改阈值

}
```



这⾥就是使⽤⼀个容量更⼤的数组来代替已有的容量⼩的数组，transfer()⽅法将原有Entry 数组的元素拷⻉到新的Entry数组⾥。

 ```java
 	void transfer(Entry[] newTable) {
 
     Entry[] src = table; //src引⽤了旧的Entry数组
 
     int newCapacity = newTable.length;
 
     for (int j = 0; j < src.length; j++) { //遍历旧的Entry数组
 
       	Entry e = src[j]; //取得旧Entry数组的每个元素
 
  				if (e != null) {
 
           src[j] = null;//释放旧Entry数组的对象引⽤（for循环后，旧的Entry数组不再引⽤任何对象）
 
           do {
 
             Entry next = e.next;
 
             int i = indexFor(e.hash, newCapacity); //！！重新计算每个元素在数组中的位置
             
             e.next = newTable[i]; //标记[1]
 
             newTable[i] = e; //将元素放在数组上
             
             e = next;  //访问下⼀个Entry链上的元素
 
           } while (e != null);
 
         }
     
     }
 
  }
 ```



 

newTable[i]的引⽤赋给了e.next，也就是使⽤了单链表的头插⼊⽅式，同⼀位置上新元素 总会被放在链表的头部位置；这样先放在⼀个索引上的元素终会被放到Entry链的尾部(如果发⽣了hash冲突的话），这⼀点和Jdk1.8有区别，下⽂详解。在旧数组中同⼀条Entry链 上的元素，通过重新计算索引位置后，有可能被放到了新数组的不同位置上。

下⾯举个例⼦说明下扩容过程。假设了我们的hash算法就是简单的⽤keymod ⼀下表的大⼩（也就是数组的⻓度。其中的哈希桶数组table的size=2， 所以key = 3、7、5，put顺序依次为 5、7、3。在mod 2以后都冲突在table[1]这⾥了。这⾥假设负载因⼦ loadFactor=1，即当键值对的实际大⼩size大于table的实际大⼩时进⾏扩容。接下来的三个步骤是哈希桶数组 resize 成4，然后所有的Node重新rehash的过程。

![image-20230124211737184](https://cdn.jsdelivr.net/gh/tacitjj/picture/image/202301242117236.png) 

 

下⾯我们讲解下JDK1.8做了哪些优化。经过观测可以发现，我们使⽤的是2次幂的扩展(指 ⻓度扩为原来2倍)，所以，元素的位置要么是在原位置，要么是在原位置再移动2次幂的位置。看下图可以明⽩这句话的意思，n为table的⻓度，图（a）表示扩容前的key1和key2两 种key确定索引位置的示例，图（b）表示扩容后key1和key2两种key确定索引位置的示例， 其中hash1是key1对应的哈希与⾼位运算结果。

![image-20230124211842725](https://cdn.jsdelivr.net/gh/tacitjj/picture/image/202301242118765.png)

 

元素在重新计算hash之后，因为n变为2倍，那么n-1的mask范围在⾼位多1bit(红⾊)，因此 新的index就会发⽣这样的变化： 

![image-20230124211931144](https://cdn.jsdelivr.net/gh/tacitjj/picture/image/202301242119179.png)



 

因此，我们在扩充HashMap的时候，不需要像JDK1.7的实现那样重新计算hash，只需要看 看原来的hash值新增的那个bit是1还是0就好了，是0的话索引没变，是1的话索引变成“原 索引+oldCap”，可以看看下图为16扩充为32的resize示意图：

![image-20230124211948086](https://cdn.jsdelivr.net/gh/tacitjj/picture/image/202301242119114.png)

 

这个设计确实⾮常的巧妙，既省去了重新计算hash值的时间，⽽且同时，由于新增的1bit 是0还是1可以认为是随机的，因此resize的过程，均匀的把之前的冲突的节点分散到新的 bucket了。这⼀块就是JDK1.8新增的优化点。有⼀点注意区别，JDK1.7中rehash的时候， 旧链表迁移新链表的时候，如果在新表的数组索引位置相同，则链表元素会倒置，但是从 上图可以看出，JDK1.8不会倒置。有兴趣的同学可以研究下JDK1.8的resize源码，写的很赞，如下:

```java
//haspmap 触发扩容的条件有两个,一个是当存放的数据超过临界值的时候会触发扩容,另外一个是当需要转成红黑树的时候,如果当前数组的长度小于 64,会触发扩容
final Node<K,V>[] resize() {
    //声明了一个 oldtab ,并且把当前(扩容前) hashmap里面的哈希表赋值过来,如果是第一次放数据,此时这两个其实都是空
        Node<K,V>[] oldTab = table;
        //获取当前(扩容前)哈希表的长度,如果是第一次的话,就是 0,否则就是扩容之前的哈希表的长度
        int oldCap = (oldTab == null) ? 0 : oldTab.length;
        //当前(扩容前)哈希表需要扩容时候的长度,其实这值就是哈希表的长度*加载因子的长度,如果是第一次放数据,就是 0
        int oldThr = threshold;
        //新的长度和新的扩容长度
        int newCap, newThr = 0;
        if (oldCap > 0) { //如果是第一次的时候,这个长度是 0,所以不符合当前判断,如果大于 0 代表是原先的老哈希表长度已经超出限制了
            if (oldCap >= MAXIMUM_CAPACITY) { //看看最新的长度是不是大于等于hashmap 对数组长度的最大限制
                threshold = Integer.MAX_VALUE;//设置为默认的最大长度
                return oldTab;
            }
            else if ((newCap = oldCap << 1) < MAXIMUM_CAPACITY && 
                     oldCap >= DEFAULT_INITIAL_CAPACITY)
                newThr = oldThr << 1; //如果没有超出长度限制,新的数组长度等于老的数组长度*2(向左移动 1 位)
        }
        else if (oldThr > 0) //如果当前的扩容长度大于 0,代表已经有哈希表
            newCap = oldThr;
        else { //代表还没有哈希表,实际上就是第一次向 map 中放数据
            newCap = DEFAULT_INITIAL_CAPACITY;//新的哈希表长度为当前map 的默认值
            newThr = (int)(DEFAULT_LOAD_FACTOR * DEFAULT_INITIAL_CAPACITY); //新的扩容长度为默认长度*默认的加载因子,这里算它的原因是为了不在后面放数据的时候每次都重新计算,因为每次都要算是不是应该扩容,如果不找变量接收,每次都要做数学运算
        }
        if (newThr == 0) {//如果新的长度还是 0,则继续计算
            float ft = (float)newCap * loadFactor;
            newThr = (newCap < MAXIMUM_CAPACITY && ft < (float)MAXIMUM_CAPACITY ?
                      (int)ft : Integer.MAX_VALUE);
        }
        threshold = newThr;//当前 hashma的扩容长度等于最新计算出来的扩容长度
        @SuppressWarnings({"rawtypes","unchecked"})
        Node<K,V>[] newTab = (Node<K,V>[])new Node[newCap];//根据最新的长度创建对应长度的哈希表,如果是首次创建,默认就是 16
        table = newTab;//将当前 hashmap 中的哈希表赋值为最新刚刚创建的哈希表
        if (oldTab != null) {//如果原老的哈希表有数据,需要将老的数据放到新的哈希表,如果是首次创建就不执行
            for (int j = 0; j < oldCap; ++j) { //遍历老的数组
                Node<K,V> e;
                if ((e = oldTab[j]) != null) { //取出当前遍历的位置上的第一个节点
                    oldTab[j] = null;
                    if (e.next == null)//如果当前节点没有后面的数据
                        newTab[e.hash & (newCap - 1)] = e; //新的数组的最新的节点上的数据直接就是这个数据
                    else if (e instanceof TreeNode) //判断是不是树节点,如果是 就重新对树进行分割,然后放到新的位置
                        ((TreeNode<K,V>)e).split(this, newTab, j, oldCap);
                    else { // 创建两个链表,主要是因为基本上扩容的时候,部分数据会在原始位置,另外一部分数据会去向后遍历老数组的长度,比如原先是数组长度是 16,原先在 1 位置上面的数据,扩容到 32 后要么就还在 1,要么就应该去17,也就是向后移动原始长度(或者是扩容增加的长度)
                        Node<K,V> loHead = null, loTail = null;
                        Node<K,V> hiHead = null, hiTail = null;
                        Node<K,V> next;
                        do {
                            next = e.next; //首先将当前的下一个数据赋值给 e
                            if ((e.hash & oldCap) == 0) {//符合应该在原始位置条件的创建一条链表
                                if (loTail == null)//如果没有数据
                                    loHead = e;//当前节点就是一个头
                                else
                                    loTail.next = e;//否则当前的尾节点下一条数据就是 e
                                loTail = e;//e 就成为了尾结点
                            }
                            else {//代表不符合原始位置的条件,就创建另外一个链表,来存放另外一部分数据
                                if (hiTail == null)//如果没有数据
                                    hiHead = e;//当前节点就是一个头
                                else
                                    hiTail.next = e;//否则当前的尾节点下一条数据就是 e
                                hiTail = e;//e 就成为了尾结点
                            }
                        } while ((e = next) != null);//如果当前位置下一个数据不等于空,继续向下找
                        if (loTail != null) { 
                            loTail.next = null;
                            newTab[j] = loHead;//遍历完成后,当前位置的数据为上面构建的应该在当前原始位置的链表数据
                        }
                        if (hiTail != null) {
                            hiTail.next = null;
                            newTab[j + oldCap] = hiHead;//将另外一部分数据直接放到后面的位置,位置为原始位置加上偏移量(因为扩容就是翻倍长度,所以偏移量就是原始的长度或者说是扩容增加的长度)
                        }
                    }
                }
            }
        }
        return newTab; //返回最新创建的那个哈希表
    }
```

##### 链表转红黑树

````java
  /**
     * Replaces all linked nodes in bin at index for given hash unless
     * table is too small, in which case resizes instead.
     */
    final void treeifyBin(Node<K,V>[] tab, int hash) {
        int n, index; Node<K,V> e;
      //如果当前哈希表是空的或者是哈希表的数组长度小于 64,则触发扩容,这也是 hashmap 扩容的第二个条件和方式
        if (tab == null || (n = tab.length) < MIN_TREEIFY_CAPACITY)
            resize();
        else if ((e = tab[index = (n - 1) & hash]) != null) {
            TreeNode<K,V> hd = null, tl = null;
            do {
                TreeNode<K,V> p = replacementTreeNode(e, null);
                if (tl == null)
                    hd = p;
                else {
                    p.prev = tl;
                    tl.next = p;
                }
                tl = p;
            } while ((e = e.next) != null);
            if ((tab[index] = hd) != null)
                hd.treeify(tab);
        }
    }
````



![image-20230124213630513](https://cdn.jsdelivr.net/gh/tacitjj/picture/image/202301242136540.png)

hashmap扩容

扩容前数组⻓度为8，扩容为原数组⻓度的2倍即16。 原来有⼀条链表在tab[2]的位置，扩 容以后仍然有⼀条链在tab[2]的位置，另外⼀条链在tab[2+8]即tab[10]的位置处。 

多线程情况，对hashmap进⾏put操作会引起resize，并可能会造成数组元素的丢失



#### 4.4 线程安全性

 

在多线程使⽤场景中，应该尽量避免使⽤线程不安全的HashMap，⽽使⽤线程安全的 ConcurrentHashMap。那么为什么说HashMap 是线程不安全的，下⾯举例⼦说明在并发的 多线程使⽤场景中使⽤HashMap 可能造成死循环。代码例⼦如下(便于理解，仍然使⽤ JDK1.7的环境)： 

````java
    public static void main(String[] args) {

        map.put(5， "C");

        new Thread("Thread1") {

            public void run() {

                map.put(7, "B");

                System.out.println(map);

            };

        }.start();

        new Thread("Thread2") {

            public void run() {

                map.put(3, "A);

                        System.out.println(map);

            };

        }.start();

    }

}
````



其中，map初始化为⼀个⻓度为2的数组，loadFactor=0.75，threshold=2*0.75=1，也就是说 当put第⼆个key的时候，map就需要进⾏resize 。



通过设置断点让线程1和线程2同时debug到transfer⽅法(3.3⼩节代码块)的⾸⾏。注意此时 两个线程已经成功添加数据。放开thread1的断点⾄transfer ⽅法的“Entry next = e.next;” 这 ⼀⾏；然后放开线程2的的断点，让线程2进⾏resize 。结果如下图。

![image-20230124214223373](https://cdn.jsdelivr.net/gh/tacitjj/picture/image/202301242142425.png)

注意，Thread1 的 e 指向了key(3)，⽽next指向了key(7)，其在线程⼆rehash后，指向了线程⼆重组后的链表。 

线程⼀被调度回来执⾏，先是执⾏

newTalbe[i] = e， 然后是e = next，导致了e指向了

key(7)，⽽下⼀次循环的next = e.next导致了next指向了key(3)。

![image-20230124214336328](https://cdn.jsdelivr.net/gh/tacitjj/picture/image/202301242143392.png)

e.next = newTable[i] 导致 key(3).next 指向了key(7)。注意：此时的key(7).next 已经指向了 key(3)， 环形链表就这样出现了。

![image-20230124214422851](https://cdn.jsdelivr.net/gh/tacitjj/picture/image/202301242144899.png)

于是，当我们⽤线程⼀调⽤map.get(11)时，悲剧就出现了——Infinite Loop。

 

#### 5.JDK1.8与JDK1.7的性能对⽐

 

HashMap中，如果key经过hash算法得出的数组索引位置全部不相同，即Hash算法⾮常 好，那样的话，getKey⽅法的时间复杂度就是O(1)，如果Hash算法技术的结果碰撞⾮常 多，假如Hash算极其差，所有的Hash算法结果得出的索引位置⼀样，那样所有的键值对都 集中到⼀个桶中，或者在⼀个链表中，或者在⼀个红⿊树中，时间复杂度分别为O(n)和 O(lgn)。 鉴于JDK1.8做了多⽅⾯的优化，总体性能优于JDK1.7，下⾯我们从两个⽅⾯⽤例 ⼦证明这⼀点。

 

Hash较均匀的情况



为了便于测试，我们先写⼀个类Key，如下：

````java
class Key implements Comparable {
        private final int value; Key(int value) {

            this.value = value;

        }
    @Override

    public int compareTo(Key o) {

        return Integer.compare(this.value, o.value);

    }

    @Override

    public boolean equals(Object o) {

        if (this == o) return true;

        if (o == null || getClass() != o.getClass())

            return false;

        Key key = (Key) o;

        return value == key.value;

    }

    @Override

    public int hashCode() {

        return value;

    }

}
````

 

这个类复写了equals⽅法，并且提供了相当好的hashCode函数，任何⼀个值的hashCode都 不会相同，因为直接使⽤value当做hashcode 。为了避免频繁的GC，我将不变的Key实例缓 存了起来，⽽不是⼀遍⼀遍的创建它们。代码如下：

````java
    public class Keys {

        public static final int MAX_KEY = 10_000_000;
    private static final Key[] KEYS_CACHE = new Key[MAX_KEY]; static {

        for (int i = 0; i < MAX_KEY; ++i) {

            KEYS_CACHE[i] = new Key(i);

        }

    }

    public static Key of(int value) {

        return KEYS_CACHE[value];

    }

}
````

 

现在开始我们的试验，测试需要做的仅仅是，创建不同size的HashMap（1、10、100、......10000000 ），屏蔽了扩容的情况，代码如下：

````java
    static void test(int mapSize) {

        HashMap map = new HashMap(mapSize);

        for (int i = 0; i < mapSize; ++i) {

            map.put(Keys.of(i), i);

        }

        long beginTime = System.nanoTime(); //获取纳秒

        for (int i = 0; i < mapSize; i++) {

            map.get(Keys.of(i));

        }

        long endTime = System.nanoTime();

        System.out.println(endTime - beginTime);
    }

    public static void main(String[] args) {
        for (int i = 10; i <= 1000 0000;
        i *= 10){
            test(i);

        }

    }
````

 

在测试中会查找不同的值，然后度量花费的时间，为了计算getKey 的平均时间，我们遍历所有的get⽅法，计算总的时间，除以key的数量，计算⼀个平均值，主要⽤来⽐较，绝对 值可能会受很多环境因素的影响。结果如下：

![image-20230124214918822](https://cdn.jsdelivr.net/gh/tacitjj/picture/image/202301242149853.png)

 

通过观测测试结果可知，JDK1.8的性能要⾼于JDK1.7 15%以上，在某些size的区域上，甚 ⾄⾼于100%。由于Hash算法较均匀，JDK1.8引⼊的红⿊树效果不明显，下⾯我们看看 Hash不均匀的的情况。 

Hash极不均匀的情况 

假设我们⼜⼀个⾮常差的Key，它们所有的实例都返回相同的hashCode值。这是使⽤ HashMap最坏的情况。代码修改如下： 

````java
class Key implements Comparable { //...

  @Override
  public int hashCode() { return 1;

  }

}
````

 

仍然执⾏main⽅法，得出的结果如下表所示：

![image-20230124215050700](/Users/jinyingxin/Library/Application%20Support/typora-user-images/image-20230124215050700.png)

 

从表中结果中可知，随着size的变大，JDK1.7的花费时间是增⻓的趋势，⽽JDK1.8 是明显 的降低趋势，并且呈现对数增⻓稳定。当⼀个链表太⻓的时候，HashMap会动态的将它替 换成⼀个红⿊树，这话的话会将时间复杂度从O(n)降为O(logn)。hash算法均匀和不均匀所 花费的时间明显也不相同，这两种情况的相对⽐较，可以说明⼀个好的hash算法的重要性。

 

#### 6. 小结

 

(1) 扩容是⼀个特别耗性能的操作，所以当程序员在使⽤HashMap 的时候，估算map的大⼩，初始化的时候给⼀个大致的数值，避免map进⾏频繁的扩容。

(2) 负载因⼦是可以修改的，也可以大于1，但是建议不要轻易易修改，除⾮情况⾮常特殊。 (3) HashMap是线程不安全的，不要在并发的环境中同时操作HashMap，建议使⽤ConcurrentHashMap。

(4) JDK1.8引⼊红⿊树大程度优化了HashMap的性能。

(5) 还没升级JDK1.8的，现在开始升级吧。HashMap的性能提升仅仅是JDK1.8的冰⼭山⼀⻆角。

#### 7. Hashmap的容量为什什么是2的幂次

::: tip

通过 JDK1.7更容易说明

:::

 

````java
    public V put(K key, V value) {
        if (key == null)
            return putForNullKey(value);//将空key的Entry加⼊到table[0]中

        int hash = hash(key.hashCode()); //计算key.hashcode()的hash值，hash函数由hashmap⾃己实现


        int i = indexFor(hash, table.length);//获取将要存放的数组下标
        /*
         * for中的代码⽤用于：当hash值相同且key相同的情况下，使⽤用新值覆盖旧值（其实就 是修改功能）
         */
        for (Entry<K, V> e = table[i]; e != null; e = e.next) {//注意：for 循环在第⼀次执行时就会先判断条件
            Object k;
            //hash值相同且key相同的情况下，使⽤新值覆盖旧值
            if (e.hash == hash && ((k = e.key) == key || key.equals(k))) {
                V oldValue = e.value;
                e.value = value;
                //e.recordAccess(this);
                return oldValue;//返回旧值
            }
        }

        modCount++;
        addEntry(hash, key, value, i);//增加一个新的Entry到table[i]
        return null;//如果没有与传⼊的key相等的Entry，就返回null
    }

    /**
     * "按位与"来获取数组下标
     */
    static int indexFor(int h, int length) {
        return h & (length - 1);
    } 
````



⾸先算得key得hashcode 值，然后跟数组的⻓度-1做⼀次“与”运算（&）。看上去很简单， 其实⽐较有⽞玄机。⽐如数组的⻓度是2的4次⽅，那么hashcode 就会和2的4次⽅-1做“与”运 算。很多⼈人都有这个疑问，为什么hashmap 的数组初始化大⼩都是2的次⽅大⼩时， hashmap的效率最⾼，我以2的4次⽅举例，来解释⼀下为什么数组大⼩为2的幂时hashmap 访问的性能最⾼。 

看下图，左边两组是数组⻓度为16（2的4次⽅），右边两组是数组⻓度为15。两组的 hashcode 均为8和9，但是很明显，当它们和1110“与”的时候，产⽣生了相同的结果，也就是 说它们会定位到数组中的同⼀个位置上去，这就产⽣生了碰撞，8和9会被放到同⼀个链表 上，那么查询的时候就需要遍历这个链表，得到8或者9，这样就降低了查询的效率。同 时，我们也可以发现，当数组⻓度为15的时候，hashcode 的值会与14（1110）进⾏“与”， 那么最后⼀位永远是0，⽽0001，0011，0101，1001，1011，0111，1101这⼏几个位置永远 都不能存放元素了，空间浪费相当大，更糟的是这种情况中，数组可以使⽤的位置⽐数组 ⻓度⼩了很多，这意味着进⼀步增加了碰撞的⼏几率，减慢了查询的效率！

![image-20230124215627204](https://cdn.jsdelivr.net/gh/tacitjj/picture/image/202301242156235.png)

 

所以说，当数组⻓度为2的n次幂的时候，不同的key算得得index相同的⼏几率较⼩，那么数 据在数组上分布就⽐较均匀，也就是说碰撞的⼏几率⼩，相对的，查询的时候就不⽤遍历某 个位置上的链表，这样查询效率也就较⾼了。说到这⾥，我们再回头看⼀下hashmap中 默认的数组大⼩是多少，查看源代码可以得知是16，为什么是16，⽽不是15，也不是20 呢，看到上⾯annegu的解释之后我们就清楚了吧，显然是因为16是2的整数次幂的原因， 在⼩数据量的情况下16⽐15和20更能减少key之间的碰撞，⽽加快查询的效率。

 

#### 8.hashmap扩容时死循环问题 

::: tip

此问题在JDK1.8时候解决

:::

大家都知道，hashmap不能⽤于多线程场景中，多线程下推荐使⽤concurrentHashmap ！ 但为什么多线程下不能使⽤hashmap那，主要原因就在于其的扩容机制。故事的起源从 hashmap的数据存放开始说起，默认hashmap大⼩是16.当数据过大时，毫⽆疑问， hashmap需要扩容去支持存放更多的数据。 源码如下 ——–Put⼀个Key,Value对到Hash表 中：

 ````java
     public V put(K key, V value) {
 
         ......
 
         //计算Hash值
         int hash = hash(key.hashCode());
 
         int i = indexFor(hash, table.length);
 
         //各种校验吧
         for (Entry<K, V> e = table[i]; e != null; e = e.next) {
             Object k;
             if (e.hash == hash && ((k = e.key) == key || key.equals(k))) {
                 V oldValue = e.value;
                 e.value = value;
                 e.recordAccess(this);
                 return oldValue;
             }
         }
 
         modCount++;
         //该key不存在，需要增加⼀个结点
         addEntry(hash, key, value, i);
         return null;
 
     }
 ````

这⾥添加⼀个节点需要检查是否超出容量，出现了⼀个负载因⼦。 

````java
void addEntry(int hash, K key, V value, int bucketIndex)
{
    Entry<K,V> e = table[bucketIndex];
    table[bucketIndex] = new Entry<K,V>(hash, key, value, e);
    //查看当前的size是否超过了我们设定的阈值threshold，如果超过，需要resize if (size++ >= threshold)
    resize(2 * table.length);//扩容都是2倍2倍的来的，
} 
````

⾄于为什么扩容都是2的幂次⽅这个问题,看上⾯。

既然新建了⼀个更⼤尺寸的hash表，然后把数据从老的Hash表中迁移到新的Hash表中。

```java
    void resize(int newCapacity)
    {
        Entry[] oldTable = table;
        int oldCapacity = oldTable.length;
        ......
        //创建⼀个新的Hash Table
        Entry[] newTable = new Entry[newCapacity]; //将Old Hash Table上的数据迁移到New Hash Table上transfer(newTable);
        table = newTable;
        threshold = (int)(newCapacity * loadFactor); 
    }
```

 

好，重点在这⾥面的transfer()!

````java
    void transfer(Entry[] newTable) {

        Entry[] src = table;
        int newCapacity = newTable.length;
        // 下⾯这段代码的意思是：
        // 从OldTable⾥摘⼀个元素出来，然后放到NewTable中
        for (int j = 0; j < src.length; j++) {
            Entry<K, V> e = src[j];
            if (e != null) {
                src[j] = null;
                do {
                    Entry<K, V> next = e.next;
                    int i = indexFor(e.hash, newCapacity);
                    e.next = newTable[i];
                    newTable[i] = e;
                    e = next;
                } while (e != null);
            }
        }
    }
````



do循环⾥面的是最能说明问题的 当只有⼀个线程的时候：

![image-20230124220940084](https://cdn.jsdelivr.net/gh/tacitjj/picture/image/202301242209106.png)

 

图上的hash算法是⾃定义的，不要纠结这个，是简单的⽤keymod ⼀下表的大⼩（也就是 数组的⻓度）。不是那个实际的hash算法！ 最上⾯的是old hash 表，其中的Hash表的 size=2, 所以key = 3, 7, 5，在mod 2以后都冲突在table[1]这⾥了。接下来的三个步骤是Hash 表 扩容变成4，然后所有的

````java
do {
    Entry<K,V> next = e.next; // <--假设线程一执行到这里就被调度挂起了
    int i = indexFor(e.hash, newCapacity);
    e.next = newTable[i];
    newTable[i] = e;
    e = next;
} while (e != null);
````



![image-20230124221036120](https://cdn.jsdelivr.net/gh/tacitjj/picture/image/202301242210155.png)



 

⽽我们的线程⼆执⾏完成了。于是我们有下⾯的这个样⼦。

注意，因为Thread1的 e 指向了key(3)，⽽next指向了key(7)，其在线程⼆rehash后，指向了线程⼆重组后的链表。我们可以看到链表的顺序被反转后。 这⾥的意思是线程1这会还没 有完全开始扩容，但e和next已经指向了，线程2是正常的扩容的，那这会在3这个位置上， 就是7->3这个顺序。 然后： 2）线程⼀被调度回来执⾏。

先是执⾏newTalbe[i] = e; 然后是e = next，导致了e指向了key(7)， ⽽下⼀次循环的next =e.next导致了next指向了key(3) 注意看图⾥面的线，线程1指向线程2⾥面的key3.

![image-20230124221141779](https://cdn.jsdelivr.net/gh/tacitjj/picture/image/202301242211802.png) 

回到线程1⾥面的时候 3）⼀切安好。线程⼀接着⼯工作。把key(7) 摘下来，放到newTable[i]的第⼀个，然后把e和next往下移。

![image-20230124221315219](https://cdn.jsdelivr.net/gh/tacitjj/picture/image/202301242213243.png)



这时候，原来的线程2⾥面的key7的e和key3的next没了，e=key3,next=null 。

4）环形链接出现。 当继续执⾏，需要将key3加回到key7的前⾯。 e.next = newTable[i] 导 致 key(3).next 指向了key(7)

注意：此时的key(7).next 已经指向了key(3)， 环形链表就这样出现了。



![image-20230124221619747](https://cdn.jsdelivr.net/gh/tacitjj/picture/image/202301242216792.png)

我理解是线程2⽣生成的e和next的关系影响到了线程1⾥面的情况。从⽽打乱了正常的e和 next的链。

 于是，当我们的线程⼀调⽤到，HashTable.get(11)时，即⼜到了3这个位置，需要插⼊新 的，那这会就e 和next就乱了。
